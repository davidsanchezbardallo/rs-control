import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BankApiError, getBalances, getTransactions, type PsuHeaders } from "@/lib/banking/enablebanking";
import { mapTransaction, pickBalance } from "./mapping";
import { daysFromToday } from "@/lib/utils/dates";

/**
 * Sincroniza saldos y movimientos de una conexión bancaria.
 * Usa la clave secreta (necesaria porque la tarea diaria se ejecuta sin usuario
 * y porque el identificador de sesión del banco no es legible desde la app).
 * QUIEN LLAME debe haber comprobado antes que es administración o la tarea programada.
 */
export async function syncConnection(connectionId: string, psu?: PsuHeaders): Promise<{ imported: number; accounts: number; error?: string }> {
  const db = createAdminClient();
  const { data: conn } = await db.from("bank_connections").select("*").eq("id", connectionId).single();
  if (!conn || conn.status !== "active") return { imported: 0, accounts: 0, error: "La conexión no está activa" };
  if (conn.valid_until && new Date(conn.valid_until) < new Date()) {
    await db.from("bank_connections").update({ status: "expired", last_error: "El permiso del banco ha caducado. Renuévalo." }).eq("id", connectionId);
    return { imported: 0, accounts: 0, error: "El permiso del banco ha caducado" };
  }
  const { data: secret } = await db.from("bank_connection_secrets").select("session_id").eq("connection_id", connectionId).single();
  const { data: accounts } = await db.from("bank_connection_accounts").select("*").eq("connection_id", connectionId).not("bank_account_id", "is", null);
  if (!secret || !accounts?.length) return { imported: 0, accounts: 0, error: accounts?.length ? "Sesión no encontrada" : "No hay cuentas vinculadas" };

  let imported = 0;
  let firstError: string | undefined;
  for (const acc of accounts) {
    try {
      const bal = pickBalance(await getBalances(acc.external_uid, psu));
      // Primera vez: últimos 90 días. Después: desde 7 días antes de la última sincronización.
      const from = acc.last_synced_at ? new Date(new Date(acc.last_synced_at).getTime() - 7 * 86_400_000).toISOString().slice(0, 10) : daysFromToday(-90);
      const txs = (await getTransactions(acc.external_uid, from, psu)).map(mapTransaction).filter((t) => t !== null);
      if (txs.length) {
        const rows = txs.map((t) => ({
          company_id: conn.company_id, account_id: acc.bank_account_id!, source: "bank", status: "confirmed" as const,
          tx_date: t.tx_date, value_date: t.value_date, amount: t.amount, kind: t.kind, description: t.description,
          counterparty_name: t.counterparty_name, bank_details: t.bank_details, external_id: t.external_id,
        }));
        const { data: ins, error } = await db.from("financial_transactions").upsert(rows, { onConflict: "account_id,external_id", ignoreDuplicates: true }).select("id");
        if (error) throw new Error(`No se han podido guardar los movimientos: ${error.message}`);
        imported += ins?.length ?? 0;
      }
      if (bal) await db.from("bank_accounts").update({ bank_balance: bal.amount, bank_balance_at: new Date().toISOString() }).eq("id", acc.bank_account_id!);
      await db.from("bank_connection_accounts").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("id", acc.id);
    } catch (e) {
      const msg = e instanceof BankApiError && e.sessionInvalid ? "El banco ha retirado o caducado el permiso. Renueva la conexión." : (e as Error).message;
      firstError ??= msg;
      await db.from("bank_connection_accounts").update({ last_error: msg }).eq("id", acc.id);
      if (e instanceof BankApiError && e.sessionInvalid) {
        await db.from("bank_connections").update({ status: "expired", last_error: msg }).eq("id", connectionId);
        break;
      }
    }
  }
  await db.from("bank_connections").update({ last_synced_at: new Date().toISOString(), ...(firstError ? { last_error: firstError } : { last_error: null }) }).eq("id", connectionId).eq("status", "active");
  return { imported, accounts: accounts.length, error: firstError };
}

/** Sincroniza todas las conexiones activas (tarea diaria). */
export async function syncAll() {
  const db = createAdminClient();
  const { data } = await db.from("bank_connections").select("id").eq("status", "active");
  const results = [];
  for (const c of data ?? []) results.push({ id: c.id, ...(await syncConnection(c.id)) });
  // Aviso a administración si alguna conexión falla
  const failed = results.filter((r) => r.error);
  if (failed.length) {
    const { data: admins } = await db.from("profiles").select("id, company_id").eq("role", "admin").eq("is_active", true);
    if (admins?.length) {
      await db.from("notifications").insert(admins.map((a) => ({ company_id: a.company_id, recipient_id: a.id, kind: "bank_sync", title: "Revisa la conexión con el banco", body: failed[0]!.error ?? "", link: "/tesoreria/bancos" })));
    }
  }
  return results;
}
