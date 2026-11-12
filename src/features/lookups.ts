import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import { ACTIVE_PROJECT_STATUSES } from "@/lib/labels";

export type Option = { value: string; label: string };

export async function activeProjectOptions(supabase: Supabase): Promise<Option[]> {
  const { data } = await supabase.from("projects").select("id, code, name").in("status", ACTIVE_PROJECT_STATUSES).order("code");
  return (data ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }));
}
export async function projectOptions(supabase: Supabase): Promise<Option[]> {
  const { data } = await supabase.from("projects").select("id, code, name").order("code", { ascending: false });
  return (data ?? []).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }));
}
export async function employeeOptions(supabase: Supabase, onlyActive = true): Promise<Option[]> {
  let q = supabase.from("employees").select("id, first_name, last_name").order("first_name");
  if (onlyActive) q = q.neq("status", "inactive");
  const { data } = await q;
  return (data ?? []).map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }));
}
export async function supplierOptions(supabase: Supabase): Promise<Option[]> {
  const { data } = await supabase.from("suppliers").select("id, name").eq("is_active", true).order("name");
  return (data ?? []).map((s) => ({ value: s.id, label: s.name }));
}
export async function clientOptions(supabase: Supabase): Promise<Option[]> {
  const { data } = await supabase.from("clients").select("id, name").eq("is_active", true).order("name");
  return (data ?? []).map((s) => ({ value: s.id, label: s.name }));
}
export async function categoryOptions(supabase: Supabase): Promise<Option[]> {
  const { data } = await supabase.from("material_categories").select("id, name").order("sort_order");
  return (data ?? []).map((s) => ({ value: s.id, label: s.name }));
}
export async function unitOptions(supabase: Supabase): Promise<Option[]> {
  const { data } = await supabase.from("units").select("id, code, name").order("name");
  return (data ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }));
}
/** Cuentas para movimientos MANUALES (las automáticas se concilian con lo importado del banco). */
export async function accountOptions(supabase: Supabase): Promise<Option[]> {
  const { data } = await supabase.from("bank_accounts").select("id, name, bank_name").eq("is_active", true).eq("sync_mode", "manual").order("name");
  return (data ?? []).map((s) => ({ value: s.id, label: `${s.name}${s.bank_name ? ` · ${s.bank_name}` : ""}` }));
}
export async function vehicleOptions(supabase: Supabase): Promise<Option[]> {
  const { data } = await supabase.from("vehicles").select("id, plate, brand, model").neq("status", "inactive").order("plate");
  return (data ?? []).map((v) => ({ value: v.id, label: `${v.plate} · ${[v.brand, v.model].filter(Boolean).join(" ")}` }));
}

/** Hoy en Madrid, formato AAAA-MM-DD (para valores por defecto de fechas). */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}
