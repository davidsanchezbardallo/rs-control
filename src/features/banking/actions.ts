"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { bankingConfigured, deleteSession, listAspsps, startAuthorization } from "@/lib/banking/enablebanking";
import { fail, formObject, friendlyError, invalid, type ActionState } from "@/lib/actions";
import { optDecimal, optText, optUuid, uuid } from "@/lib/validations/common";
import { syncConnection } from "./sync";

const NO = "Operación reservada a administración.";
const refresh = () => {
  revalidatePath("/tesoreria", "layout");
  revalidatePath("/panel");
  revalidatePath("/facturas", "layout");
};

async function psuFromRequest() {
  const h = await headers();
  return { ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: h.get("user-agent") };
}

/** Paso 1: inicia la autorización en el banco elegido y redirige a su web. */
export async function startBankConnection(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  if (!bankingConfigured()) return fail("La conexión bancaria aún no está configurada (faltan las claves de Enable Banking en el servidor).");
  const p = z.object({ aspsp: z.string().trim().min(2).max(120), psu_type: z.enum(["business", "personal"]).default("business") }).safeParse(formObject(fd));
  if (!p.success) return fail("Elige un banco.");
  let validUntil = new Date(Date.now() + 180 * 86_400_000);
  try {
    const aspsp = (await listAspsps("ES")).find((a) => a.name === p.data.aspsp);
    if (!aspsp) return fail("Banco no disponible.");
    if (aspsp.maximum_consent_validity) validUntil = new Date(Date.now() + Math.min(aspsp.maximum_consent_validity * 1000, 180 * 86_400_000) - 60_000);
  } catch {
    return fail("No se ha podido contactar con el servicio bancario. Inténtalo de nuevo.");
  }
  const db = createAdminClient();
  const { data: conn, error } = await db
    .from("bank_connections")
    .insert({ company_id: s.profile.companyId, aspsp_name: p.data.aspsp, psu_type: p.data.psu_type, created_by: s.profile.id })
    .select("id, state")
    .single();
  if (error || !conn) return fail("No se ha podido iniciar la conexión.");
  let url: string;
  try {
    url = (await startAuthorization({ aspsp: { name: p.data.aspsp, country: "ES" }, state: conn.state, validUntil, psuType: p.data.psu_type })).url;
  } catch (e) {
    await db.from("bank_connections").update({ status: "error", last_error: (e as Error).message }).eq("id", conn.id);
    return fail(`El banco no ha aceptado la solicitud: ${(e as Error).message}`);
  }
  redirect(url);
}

/** Vincula una cuenta del banco con una cuenta de RS Control (existente o nueva). */
export async function mapBankAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ link_id: uuid(), bank_account_id: z.string().min(1, "Elige una cuenta") }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const db = createAdminClient();
  const { data: link } = await db.from("bank_connection_accounts").select("*, connection:bank_connections(aspsp_name, company_id, status)").eq("id", p.data.link_id).single();
  if (!link || link.company_id !== s.profile.companyId) return fail("Cuenta no encontrada.");
  let accountId = p.data.bank_account_id;
  if (accountId === "new") {
    const { data: acc, error } = await db
      .from("bank_accounts")
      .insert({ company_id: s.profile.companyId, name: link.name || `Cuenta ${link.connection?.aspsp_name}`, bank_name: link.connection?.aspsp_name ?? null, iban: link.iban, opening_balance: 0, opening_date: new Date().toISOString().slice(0, 10), sync_mode: "bank" })
      .select("id")
      .single();
    if (error || !acc) return fail(friendlyError(error));
    accountId = acc.id;
  } else {
    if (!z.string().uuid().safeParse(accountId).success) return fail("Cuenta no válida.");
    const { data: acc } = await db.from("bank_accounts").select("company_id").eq("id", accountId).single();
    if (!acc || acc.company_id !== s.profile.companyId) return fail("Cuenta no válida.");
    await db.from("bank_accounts").update({ sync_mode: "bank" }).eq("id", accountId);
  }
  const { error } = await db.from("bank_connection_accounts").update({ bank_account_id: accountId }).eq("id", link.id);
  if (error) return fail(error.code === "23505" ? "Esa cuenta de RS Control ya está vinculada a otra cuenta del banco." : friendlyError(error));
  const r = await syncConnection(link.connection_id, await psuFromRequest());
  refresh();
  // El formulario desaparece al quedar vinculada: el resultado se muestra en la página
  const msg = r.error ? `Vinculada, pero la primera descarga ha fallado: ${r.error}` : `Cuenta vinculada. ${r.imported} movimientos importados.`;
  redirect(`/tesoreria/bancos/${link.connection_id}?${r.error ? "error" : "msg"}=${encodeURIComponent(msg)}`);
}

export async function syncNow(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const id = String(fd.get("connection_id") ?? "");
  const db = createAdminClient();
  const { data: conn } = await db.from("bank_connections").select("company_id").eq("id", id).single();
  if (!conn || conn.company_id !== s.profile.companyId) return fail("Conexión no encontrada.");
  const r = await syncConnection(id, await psuFromRequest());
  refresh();
  return r.error ? fail(r.error) : { ok: true, message: `Actualizado. ${r.imported} movimientos nuevos.` };
}

export async function disconnectBank(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const id = String(fd.get("connection_id") ?? "");
  const db = createAdminClient();
  const { data: conn } = await db.from("bank_connections").select("company_id").eq("id", id).single();
  if (!conn || conn.company_id !== s.profile.companyId) return fail("Conexión no encontrada.");
  const { data: secret } = await db.from("bank_connection_secrets").select("session_id").eq("connection_id", id).maybeSingle();
  if (secret) await deleteSession(secret.session_id).catch(() => undefined); // retira el permiso también en el banco
  await db.from("bank_connection_secrets").delete().eq("connection_id", id);
  await db.from("bank_connections").update({ status: "revoked", last_error: null }).eq("id", id);
  refresh();
  redirect(`/tesoreria/bancos?msg=${encodeURIComponent("Conexión retirada. Los movimientos ya importados se conservan.")}`);
}

// ------------------------------------------------------------------ Conciliación
export async function linkTransaction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ invoice_id: uuid("Factura"), transaction_id: uuid("Movimiento"), amount: optDecimal }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { error } = await s.supabase.rpc("invoice_link_transaction", { p_invoice: p.data.invoice_id, p_transaction: p.data.transaction_id, p_amount: p.data.amount });
  if (error) return fail(friendlyError(error));
  refresh();
  // El movimiento conciliado desaparece de la lista: el aviso se muestra en la página
  const { data: inv } = await s.supabase.from("invoices").select("number").eq("id", p.data.invoice_id).single();
  redirect(`/tesoreria/conciliacion?msg=${encodeURIComponent(`Conciliado con la factura ${inv?.number ?? ""}. Su estado ya está actualizado.`)}`);
}

export async function unlinkPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const id = String(fd.get("payment_id") ?? "");
  const { error } = await s.supabase.rpc("invoice_unlink_payment", { p_payment: id });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Conciliación deshecha." };
}

/** Clasificar un movimiento importado (categoría y obra); el importe nunca cambia. */
export async function classifyTransaction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ id: uuid(), category: optText(60), project_id: optUuid }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { error } = await s.supabase.from("financial_transactions").update({ category: p.data.category ?? null, project_id: p.data.project_id ?? null }).eq("id", p.data.id);
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Guardado." };
}
