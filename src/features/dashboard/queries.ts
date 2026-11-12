import "server-only";
import type { Supabase } from "@/lib/supabase/server";

const pad = (n: number) => String(n).padStart(2, "0");

/** Primer día de hace N meses (AAAA-MM-01) en hora de Madrid. */
export function monthStart(offset = 0) {
  const now = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()));
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** Ingresos y gastos por mes (movimientos bancarios confirmados, sin transferencias internas). */
export async function monthlyIncomeExpense(supabase: Supabase, months = 6) {
  const since = monthStart(months - 1);
  const { data } = await supabase.from("financial_transactions").select("tx_date, amount, kind").eq("status", "confirmed").neq("kind", "transfer").gte("tx_date", since);
  const buckets = new Map<string, { month: string; income: number; expense: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const k = monthStart(i).slice(0, 7);
    buckets.set(k, { month: MONTHS[Number(k.slice(5, 7)) - 1]!, income: 0, expense: 0 });
  }
  for (const t of data ?? []) {
    const b = buckets.get(t.tx_date.slice(0, 7));
    if (!b) continue;
    const a = Number(t.amount);
    if (a > 0) b.income += a;
    else b.expense += -a;
  }
  return [...buckets.values()].map((b) => ({ ...b, income: Math.round(b.income), expense: Math.round(b.expense) }));
}

export async function bankTotal(supabase: Supabase) {
  const { data } = await supabase.from("v_bank_balances").select("balance, is_active").eq("is_active", true);
  return { total: (data ?? []).reduce((s, r) => s + Number(r.balance), 0), accounts: data?.length ?? 0 };
}
