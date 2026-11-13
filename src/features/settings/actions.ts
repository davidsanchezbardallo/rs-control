"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { getAdminOrNull, requireUser } from "@/lib/auth/session";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, usernameToEmail } from "@/lib/supabase/env";
import { fail, formObject, friendlyError, invalid, type ActionState } from "@/lib/actions";
import { decimal, optText, text } from "@/lib/validations/common";

const NO = "Operación reservada a administración.";
const nul = <T,>(v: T | undefined) => v ?? null;

export async function saveCompany(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z
    .object({
      name: text("Razón social", 160), tax_id: optText(15), address: optText(200), city: optText(80), phone: optText(30),
      trade_name: optText(80), tagline: optText(160), phone_2: optText(30),
      email: z.string().trim().email("Email no válido").optional(),
      vacation_days_per_year: z.string().transform(Number).pipe(z.number().int().min(0).max(60)),
      alert_days: z.string().transform(Number).pipe(z.number().int().min(1).max(180)),
    })
    .safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const d = p.data;
  const { error } = await s.supabase
    .from("companies")
    .update({ name: d.name, trade_name: nul(d.trade_name), tagline: nul(d.tagline), phone_2: nul(d.phone_2), tax_id: nul(d.tax_id), address: nul(d.address), city: nul(d.city), phone: nul(d.phone), email: nul(d.email), settings: { vacation_days_per_year: d.vacation_days_per_year, alert_days: d.alert_days } })
    .eq("id", s.profile.companyId);
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return { ok: true, message: "Datos de empresa guardados." };
}

export async function saveCatalogItem(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const kind = raw.kind;
  let error;
  if (kind === "category") {
    const p = z.object({ name: text("Nombre", 80), sort_order: z.string().default("0").transform(Number) }).safeParse(raw);
    if (!p.success) return invalid(p.error);
    ({ error } = raw.id ? await s.supabase.from("material_categories").update(p.data).eq("id", raw.id) : await s.supabase.from("material_categories").insert({ ...p.data, company_id: s.profile.companyId }));
  } else if (kind === "unit") {
    const p = z.object({ code: text("Código", 10).transform((v) => v.toLowerCase()), name: text("Nombre", 40), allows_decimals: z.string().optional() }).safeParse(raw);
    if (!p.success) return invalid(p.error);
    const row = { code: p.data.code, name: p.data.name, allows_decimals: p.data.allows_decimals === "on" };
    ({ error } = raw.id ? await s.supabase.from("units").update(row).eq("id", raw.id) : await s.supabase.from("units").insert({ ...row, company_id: s.profile.companyId }));
  } else if (kind === "cost") {
    const p = z.object({ name: text("Categoría", 60), hourly_cost: decimal("Coste por hora").pipe(z.number().min(0)), is_active: z.string().optional() }).safeParse(raw);
    if (!p.success) return invalid(p.error);
    const row = { name: p.data.name, hourly_cost: p.data.hourly_cost, is_active: raw.id ? p.data.is_active === "on" : true };
    ({ error } = raw.id ? await s.supabase.from("labor_cost_categories").update(row).eq("id", raw.id) : await s.supabase.from("labor_cost_categories").insert({ ...row, company_id: s.profile.companyId }));
  } else return fail("Tipo no válido.");
  if (error) return fail(friendlyError(error));
  revalidatePath("/configuracion", "layout");
  return { ok: true, message: "Guardado." };
}

/** Cambio de la propia contraseña: verifica la actual antes de cambiarla. */
export async function changeOwnPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireUser();
  const p = z
    .object({ current: z.string().min(1, "Escribe tu contraseña actual"), next: z.string().min(10, "Mínimo 10 caracteres").max(72).refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Combina letras y números"), repeat: z.string() })
    .refine((v) => v.next === v.repeat, { message: "Las contraseñas no coinciden", path: ["repeat"] })
    .safeParse({ current: fd.get("current"), next: fd.get("next"), repeat: fd.get("repeat") });
  if (!p.success) return invalid(p.error);
  const check = createPlainClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: wrong } = await check.auth.signInWithPassword({ email: usernameToEmail(profile.username), password: p.data.current });
  if (wrong) return { ok: false, message: "La contraseña actual no es correcta.", fieldErrors: { current: ["Incorrecta"] } };
  await check.auth.signOut({ scope: "local" }); // "local": no cierra la sesión real del usuario
  const { error } = await supabase.auth.updateUser({ password: p.data.next });
  if (error) return fail("No se ha podido cambiar la contraseña.");
  return { ok: true, message: "Contraseña cambiada." };
}
