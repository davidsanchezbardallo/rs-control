"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth/session";
import { fail, formObject, friendlyError, invalid, type ActionState } from "@/lib/actions";
import { optText, text } from "@/lib/validations/common";

const NO = "Operación reservada a administración.";
const nul = <T,>(v: T | undefined) => v ?? null;
const taxId = z.string().trim().toUpperCase().max(15).optional();

export async function saveClient(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const p = z.object({ kind: z.enum(["company", "individual", "community", "public"]), name: text("Nombre", 160), tax_id: taxId, address: optText(200), city: optText(80), contact_name: optText(120), phone: optText(30), email: z.string().trim().email("Email no válido").optional(), notes: optText(1000) }).safeParse(raw);
  if (!p.success) return invalid(p.error);
  const d = p.data;
  const row = { kind: d.kind, name: d.name, tax_id: nul(d.tax_id), address: nul(d.address), city: nul(d.city), contact_name: nul(d.contact_name), phone: nul(d.phone), email: nul(d.email), notes: nul(d.notes) };
  const { error } = raw.id ? await s.supabase.from("clients").update(row).eq("id", raw.id) : await s.supabase.from("clients").insert({ ...row, company_id: s.profile.companyId });
  if (error) return fail(friendlyError(error));
  revalidatePath("/contactos");
  return { ok: true, message: "Cliente guardado." };
}

export async function saveSupplier(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const p = z.object({ name: text("Nombre", 160), tax_id: taxId, contact_name: optText(120), phone: optText(30), email: z.string().trim().email("Email no válido").optional(), payment_terms_days: z.string().optional().transform((v) => (v ? Number(v) : undefined)).pipe(z.number().int().min(0).max(365).optional()), notes: optText(1000) }).safeParse(raw);
  if (!p.success) return invalid(p.error);
  const d = p.data;
  const row = { name: d.name, tax_id: nul(d.tax_id), contact_name: nul(d.contact_name), phone: nul(d.phone), email: nul(d.email), payment_terms_days: nul(d.payment_terms_days), notes: nul(d.notes) };
  const { error } = raw.id ? await s.supabase.from("suppliers").update(row).eq("id", raw.id) : await s.supabase.from("suppliers").insert({ ...row, company_id: s.profile.companyId });
  if (error) return fail(friendlyError(error));
  revalidatePath("/contactos");
  return { ok: true, message: "Proveedor guardado." };
}
