import { NextResponse, type NextRequest } from "next/server";
import { getAdminOrNull } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSession } from "@/lib/banking/enablebanking";
import { normalizeIban } from "@/features/banking/mapping";

/**
 * Retorno desde el banco tras autorizar el acceso (paso 2).
 * Comprueba la sesión de administración y el parámetro `state` (anti-falsificación),
 * crea la sesión bancaria y guarda su identificador en la tabla protegida.
 */
export async function GET(req: NextRequest) {
  const base = new URL("/tesoreria/bancos", req.url);
  const s = await getAdminOrNull();
  if (!s) return NextResponse.redirect(new URL("/login", req.url));
  const q = req.nextUrl.searchParams;
  const state = q.get("state") ?? "";
  const db = createAdminClient();
  const { data: conn } = await db.from("bank_connections").select("*").eq("state", state).eq("status", "pending").maybeSingle();
  // La solicitud debe ser reciente, de esta empresa y de este mismo usuario
  if (!conn || conn.company_id !== s.profile.companyId || conn.created_by !== s.profile.id || Date.now() - new Date(conn.created_at).getTime() > 60 * 60_000) {
    base.searchParams.set("error", "La solicitud de conexión no es válida o ha caducado. Vuelve a intentarlo.");
    return NextResponse.redirect(base);
  }
  if (q.get("error") || !q.get("code")) {
    const msg = q.get("error_description") || "Has cancelado la autorización en el banco.";
    await db.from("bank_connections").update({ status: "error", last_error: msg.slice(0, 300) }).eq("id", conn.id);
    base.searchParams.set("error", msg.slice(0, 200));
    return NextResponse.redirect(base);
  }
  try {
    const session = await createSession(q.get("code")!);
    await db.from("bank_connection_secrets").upsert({ connection_id: conn.id, session_id: session.session_id, updated_at: new Date().toISOString() });
    const { data: ownAccounts } = await db.from("bank_accounts").select("id, iban").eq("company_id", conn.company_id);
    const { data: alreadyMapped } = await db.from("bank_connection_accounts").select("bank_account_id").eq("company_id", conn.company_id).not("bank_account_id", "is", null);
    const taken = new Set((alreadyMapped ?? []).map((a) => a.bank_account_id));
    const rows = session.accounts
      .filter((a) => a.uid)
      .map((a) => {
        const iban = normalizeIban(a.account_id?.iban);
        const match = iban ? ownAccounts?.find((o) => normalizeIban(o.iban) === iban && !taken.has(o.id)) : undefined;
        return { company_id: conn.company_id, connection_id: conn.id, external_uid: a.uid!, iban: iban || null, name: a.details || a.product || a.name || null, currency: a.currency, bank_account_id: match?.id ?? null };
      });
    if (rows.length) await db.from("bank_connection_accounts").upsert(rows, { onConflict: "connection_id,external_uid" });
    const matched = rows.filter((r) => r.bank_account_id).map((r) => r.bank_account_id!);
    if (matched.length) await db.from("bank_accounts").update({ sync_mode: "bank" }).in("id", matched);
    await db
      .from("bank_connections")
      .update({ status: "active", authorized_at: new Date().toISOString(), valid_until: session.access?.valid_until ?? null, last_error: rows.length ? null : "El banco no ha devuelto cuentas. Comprueba que están vinculadas en Enable Banking." })
      .eq("id", conn.id);
    return NextResponse.redirect(new URL(`/tesoreria/bancos/${conn.id}?ok=1`, req.url));
  } catch (e) {
    await db.from("bank_connections").update({ status: "error", last_error: (e as Error).message.slice(0, 300) }).eq("id", conn.id);
    base.searchParams.set("error", "El banco no ha completado la conexión. Inténtalo de nuevo.");
    return NextResponse.redirect(base);
  }
}
