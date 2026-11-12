import "server-only";
import { createSign } from "node:crypto";

/**
 * Cliente de la API de Enable Banking (banca abierta PSD2, solo lectura).
 * Documentación: https://enablebanking.com/docs/api/reference/
 *
 * Seguridad: la clave privada de la aplicación SOLO existe en el servidor
 * (variable ENABLE_BANKING_PRIVATE_KEY). Cada petición se firma con un JWT RS256
 * de vida corta. RS Control nunca recibe las credenciales del banco del usuario.
 */

const API = (process.env.ENABLE_BANKING_API_URL ?? "https://api.enablebanking.com").replace(/\/$/, "");

export function bankingConfigured(): boolean {
  return !!process.env.ENABLE_BANKING_APP_ID && !!process.env.ENABLE_BANKING_PRIVATE_KEY && !!process.env.APP_URL;
}

export function redirectUrl(): string {
  return `${process.env.APP_URL!.replace(/\/$/, "")}/api/banca/callback`;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

/** JWT firmado (cabecera typ/alg/kid; claims iss/aud/iat/exp), válido 1 hora (máx. permitido 24 h). */
export function signJwt(appId: string, privateKeyPem: string, now = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "RS256", kid: appId }));
  const body = b64url(JSON.stringify({ iss: "enablebanking.com", aud: "api.enablebanking.com", iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${body}`);
  return `${header}.${body}.${b64url(signer.sign(privateKeyPem))}`;
}

export class BankApiError extends Error {
  constructor(public status: number, public code: string | undefined, message: string) {
    super(message);
  }
  /** La sesión del banco ya no es válida (caducada, revocada o cerrada): hay que renovar el permiso. */
  get sessionInvalid() {
    return this.status === 401 || this.status === 403 || ["EXPIRED_SESSION", "CLOSED_SESSION", "REVOKED_SESSION", "SESSION_DOES_NOT_EXIST", "ACCESS_DENIED"].includes(this.code ?? "");
  }
}

/** Cabeceras que indican que el usuario está presente (evita el límite de 4 consultas diarias sin usuario). */
export type PsuHeaders = { ip?: string | null; userAgent?: string | null };

async function call<T>(path: string, init: { method?: string; body?: unknown; psu?: PsuHeaders } = {}): Promise<T> {
  const key = process.env.ENABLE_BANKING_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${signJwt(process.env.ENABLE_BANKING_APP_ID!, key)}`,
    Accept: "application/json",
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.psu?.ip) headers["Psu-Ip-Address"] = init.psu.ip;
  if (init.psu?.userAgent) headers["Psu-User-Agent"] = init.psu.userAgent.slice(0, 300);
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new BankApiError(res.status, data?.error, data?.message ?? `Error ${res.status} del servicio bancario`);
  return data as T;
}

// ------------------------------------------------------------------ Tipos (subconjunto usado)
export type Amount = { amount: string; currency: string };
export type Aspsp = { name: string; country: string; maximum_consent_validity?: number; psu_types?: string[]; beta?: boolean; logo?: string };
export type BankAccount = { uid?: string; account_id?: { iban?: string }; name?: string; details?: string; product?: string; currency: string };
export type Balance = { name?: string; balance_amount: Amount; balance_type: string; reference_date?: string; last_change_date_time?: string };
export type BankTransaction = {
  entry_reference?: string | null;
  transaction_id?: string | null;
  transaction_amount: Amount;
  credit_debit_indicator: "CRDT" | "DBIT";
  status: string;
  booking_date?: string | null;
  value_date?: string | null;
  transaction_date?: string | null;
  creditor?: { name?: string | null } | null;
  debtor?: { name?: string | null } | null;
  remittance_information?: string[] | null;
  reference_number?: string | null;
};

// ------------------------------------------------------------------ Operaciones
export async function listAspsps(country = "ES"): Promise<Aspsp[]> {
  const r = await call<{ aspsps: Aspsp[] }>(`/aspsps?country=${encodeURIComponent(country)}&service=AIS`);
  return r.aspsps ?? [];
}

export async function startAuthorization(p: { aspsp: { name: string; country: string }; state: string; validUntil: Date; psuType: "business" | "personal" }) {
  return call<{ url: string; authorization_id: string }>("/auth", {
    method: "POST",
    body: {
      access: { valid_until: p.validUntil.toISOString(), balances: true, transactions: true },
      aspsp: p.aspsp,
      state: p.state,
      redirect_url: redirectUrl(),
      psu_type: p.psuType,
      language: "es",
    },
  });
}

export async function createSession(code: string) {
  return call<{ session_id: string; accounts: BankAccount[]; access: { valid_until: string }; aspsp: { name: string; country: string } }>("/sessions", {
    method: "POST",
    body: { code },
  });
}

export async function deleteSession(sessionId: string) {
  return call<unknown>(`/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}

export async function getBalances(uid: string, psu?: PsuHeaders) {
  return (await call<{ balances: Balance[] }>(`/accounts/${encodeURIComponent(uid)}/balances`, { psu })).balances ?? [];
}

/** Descarga todas las páginas de movimientos desde una fecha (máximo 50 páginas por seguridad). */
export async function getTransactions(uid: string, dateFrom: string, psu?: PsuHeaders): Promise<BankTransaction[]> {
  const all: BankTransaction[] = [];
  let key: string | undefined;
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams({ date_from: dateFrom });
    if (key) qs.set("continuation_key", key);
    const r = await call<{ transactions: BankTransaction[]; continuation_key?: string | null }>(`/accounts/${encodeURIComponent(uid)}/transactions?${qs}`, { psu });
    all.push(...(r.transactions ?? []));
    if (!r.continuation_key) break;
    key = r.continuation_key;
  }
  return all;
}
