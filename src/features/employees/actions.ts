"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/supabase/env";
import { fail, formObject, friendlyError, invalid, type ActionState } from "@/lib/actions";
import { date, optDate, optText, optUuid, text, uuid } from "@/lib/validations/common";

const NO = "Operación reservada a administración.";
const refresh = () => revalidatePath("/trabajadores", "layout");

const employeeSchema = z.object({
  code: text("Identificador interno", 20),
  first_name: text("Nombre", 80),
  last_name: text("Apellidos", 120),
  national_id: z.string().trim().toUpperCase().regex(/^([0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])$/, "DNI/NIE con formato no válido").optional(),
  phone: optText(30),
  email: z.string().trim().email("Email no válido").optional(),
  job_title: optText(80),
  hire_date: optDate,
  end_date: optDate,
  status: z.enum(["active", "leave", "inactive"]).default("active"),
  cost_category_id: optUuid,
  notes: optText(2000),
});

export async function saveEmployee(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const p = employeeSchema.safeParse(raw);
  if (!p.success) return invalid(p.error);
  const d = p.data;
  const row = {
    code: d.code, first_name: d.first_name, last_name: d.last_name, national_id: d.national_id ?? null, phone: d.phone ?? null,
    email: d.email ?? null, job_title: d.job_title ?? null, hire_date: d.hire_date ?? null, end_date: d.end_date ?? null,
    status: d.status, cost_category_id: d.cost_category_id ?? null, notes: d.notes ?? null,
  };
  if (raw.id) {
    const { error } = await s.supabase.from("employees").update(row).eq("id", raw.id);
    if (error) return fail(friendlyError(error));
    refresh();
    return { ok: true, message: "Ficha guardada." };
  }
  const { data, error } = await s.supabase.from("employees").insert({ ...row, company_id: s.profile.companyId }).select("id").single();
  if (error) return fail(friendlyError(error));
  refresh();
  redirect(`/trabajadores/${data.id}`);
}

export async function addAbsence(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z
    .object({ employee_id: uuid(), kind: z.enum(["vacation", "personal", "paid_leave", "sick_leave", "other"]), start_date: date("Desde"), end_date: date("Hasta"), days: z.string().transform(Number).pipe(z.number().positive("Indica los días")), notes: optText(500) })
    .refine((v) => v.end_date >= v.start_date, { message: "La fecha final es anterior a la inicial", path: ["end_date"] })
    .safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { error } = await s.supabase.from("absences").insert({ ...p.data, notes: p.data.notes ?? null, company_id: s.profile.companyId });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Ausencia registrada." };
}

export async function addTraining(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ employee_id: uuid(), name: text("Formación", 160), provider: optText(120), hours: optText(10), completed_on: optDate, expires_on: optDate }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { error } = await s.supabase.from("trainings").insert({
    company_id: s.profile.companyId, employee_id: p.data.employee_id, name: p.data.name, provider: p.data.provider ?? null,
    hours: p.data.hours ? Number(p.data.hours.replace(",", ".")) : null, completed_on: p.data.completed_on ?? null, expires_on: p.data.expires_on ?? null,
  });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Formación registrada." };
}

export async function addPpe(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ employee_id: uuid(), item: text("EPI", 120), quantity: z.string().default("1").transform(Number).pipe(z.number().int().positive()), delivered_on: date("Fecha de entrega"), next_renewal_on: optDate, acknowledged: z.string().optional() }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { error } = await s.supabase.from("ppe_deliveries").insert({
    company_id: s.profile.companyId, employee_id: p.data.employee_id, item: p.data.item, quantity: p.data.quantity,
    delivered_on: p.data.delivered_on, next_renewal_on: p.data.next_renewal_on ?? null, acknowledged: p.data.acknowledged === "on",
  });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Entrega de EPI registrada." };
}

// ----------------------------------------------------------------- Acceso a la app
const password = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(72)
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), "Combina letras y números");
const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,40}$/, "Solo minúsculas, números, punto, guion o guion bajo (3 a 40)");

/** Crea la cuenta de acceso. Usa la clave secreta SOLO después de verificar que quien llama es admin. */
export async function createAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ employee_id: optUuid, username, password, full_name: text("Nombre", 120), role: z.enum(["admin", "worker"]) }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  if (p.data.role === "worker" && !p.data.employee_id) return fail("Un trabajador debe estar vinculado a su ficha.");
  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({ email: usernameToEmail(p.data.username), password: p.data.password, email_confirm: true });
  if (error || !created.user) return fail(error?.message.includes("already") ? "Ese nombre de usuario ya existe." : "No se ha podido crear el usuario.");
  const { error: pe } = await admin.from("profiles").insert({
    id: created.user.id, company_id: s.profile.companyId, role: p.data.role, username: p.data.username,
    full_name: p.data.full_name, employee_id: p.data.employee_id ?? null,
  });
  if (pe) {
    await admin.auth.admin.deleteUser(created.user.id); // deshace la creación para no dejar cuentas huérfanas
    return fail(pe.code === "23505" ? "Ese usuario o esa ficha ya tienen cuenta." : friendlyError(pe));
  }
  refresh();
  revalidatePath("/configuracion", "layout");
  return { ok: true, message: `Cuenta creada. Usuario: ${p.data.username}. Entrégale la contraseña en persona.` };
}

export async function resetPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ profile_id: uuid(), password }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { data: target } = await s.supabase.from("profiles").select("id").eq("id", p.data.profile_id).maybeSingle();
  if (!target) return fail("Usuario no encontrado.");
  const { error } = await createAdminClient().auth.admin.updateUserById(p.data.profile_id, { password: p.data.password });
  if (error) return fail("No se ha podido cambiar la contraseña.");
  return { ok: true, message: "Contraseña cambiada." };
}

export async function setAccountActive(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const id = String(fd.get("profile_id") ?? "");
  const active = fd.get("active") === "true";
  if (id === s.profile.id) return fail("No puedes desactivar tu propia cuenta.");
  const { error } = await s.supabase.from("profiles").update({ is_active: active }).eq("id", id);
  if (error) return fail(friendlyError(error));
  // Al desactivar, las funciones de seguridad (is_active) bloquean de inmediato
  // cualquier acceso a datos y la app le devuelve al inicio de sesión.
  refresh();
  revalidatePath("/configuracion", "layout");
  return { ok: true, message: active ? "Acceso activado." : "Acceso desactivado." };
}
