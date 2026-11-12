"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth/session";
import { fail, formObject, friendlyError, invalid, type ActionState } from "@/lib/actions";
import { date, decimal, optDate, optDecimal, optText, optUuid, text, uuid } from "@/lib/validations/common";

const NO = "Operación reservada a administración.";
const STATUS = z.enum(["budgeted", "pending_approval", "approved", "preparation", "in_progress", "paused", "finished", "closed"]);

const projectSchema = z.object({
  code: optText(30),
  name: text("Nombre", 160),
  client_id: optUuid,
  work_type: optText(60),
  address: optText(200),
  city: optText(80),
  start_date: optDate,
  planned_end_date: optDate,
  actual_end_date: optDate,
  manager_employee_id: optUuid,
  status: STATUS.default("budgeted"),
  description: optText(2000),
  notes: optText(2000),
});

async function nextProjectCode(supabase: NonNullable<Awaited<ReturnType<typeof getAdminOrNull>>>["supabase"]) {
  const year = new Date().getFullYear();
  const { data } = await supabase.from("projects").select("code").like("code", `OB-${year}-%`).order("code", { ascending: false }).limit(1);
  const last = Number(data?.[0]?.code.split("-")[2] ?? 0);
  return `OB-${year}-${String(last + 1).padStart(3, "0")}`;
}

export async function saveProject(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const p = projectSchema.safeParse(raw);
  if (!p.success) return invalid(p.error);
  const nul = <T,>(v: T | undefined) => v ?? null;
  const row = {
    name: p.data.name, client_id: nul(p.data.client_id), work_type: nul(p.data.work_type), address: nul(p.data.address), city: nul(p.data.city),
    start_date: nul(p.data.start_date), planned_end_date: nul(p.data.planned_end_date), actual_end_date: nul(p.data.actual_end_date),
    manager_employee_id: nul(p.data.manager_employee_id), status: p.data.status, description: nul(p.data.description), notes: nul(p.data.notes),
  };
  if (raw.id) {
    const { error } = await s.supabase.from("projects").update({ ...row, ...(p.data.code ? { code: p.data.code.toUpperCase() } : {}) }).eq("id", raw.id);
    if (error) return fail(friendlyError(error));
    revalidatePath("/obras", "layout");
    return { ok: true, message: "Obra guardada." };
  }
  const code = p.data.code?.toUpperCase() ?? (await nextProjectCode(s.supabase));
  const { data, error } = await s.supabase.from("projects").insert({ ...row, code, company_id: s.profile.companyId }).select("id").single();
  if (error) return fail(friendlyError(error));
  revalidatePath("/obras", "layout");
  redirect(`/obras/${data.id}`);
}

export async function setProjectStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ id: uuid(), status: STATUS }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const patch: { status: typeof p.data.status; actual_end_date?: string } = { status: p.data.status };
  if (p.data.status === "finished") patch.actual_end_date = new Date().toISOString().slice(0, 10);
  const { error } = await s.supabase.from("projects").update(patch).eq("id", p.data.id);
  if (error) return fail(friendlyError(error));
  revalidatePath("/obras", "layout");
  return { ok: true, message: "Estado actualizado." };
}

export async function addAssignment(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ project_id: uuid(), employee_id: uuid("Trabajador"), role_in_project: optText(80), start_date: optDate }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { error } = await s.supabase.from("project_assignments").insert({
    company_id: s.profile.companyId, project_id: p.data.project_id, employee_id: p.data.employee_id,
    role_in_project: p.data.role_in_project ?? null, start_date: p.data.start_date ?? new Date().toISOString().slice(0, 10),
  });
  if (error) return fail(error.code === "23505" ? "Ese trabajador ya está asignado a la obra." : friendlyError(error));
  revalidatePath("/obras", "layout");
  revalidatePath("/trabajadores", "layout");
  return { ok: true, message: "Trabajador asignado." };
}

export async function endAssignment(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const id = String(fd.get("id") ?? "");
  const { error } = await s.supabase.from("project_assignments").update({ end_date: new Date().toISOString().slice(0, 10) }).eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidatePath("/obras", "layout");
  revalidatePath("/trabajadores", "layout");
  return { ok: true, message: "Asignación finalizada." };
}

export async function addBudgetItem(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ project_id: uuid(), kind: z.enum(["initial", "additional", "certification"]), reference: optText(60), item_date: date("Fecha"), amount: decimal("Importe"), notes: optText(500) }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { error } = await s.supabase.from("project_budget_items").insert({ ...p.data, reference: p.data.reference ?? null, notes: p.data.notes ?? null, company_id: s.profile.companyId });
  if (error) return fail(friendlyError(error));
  revalidatePath("/obras", "layout");
  return { ok: true, message: "Ingreso previsto añadido." };
}

export async function saveEstimates(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const projectId = String(fd.get("project_id") ?? "");
  const cats = ["material", "labor", "subcontract", "travel", "rental", "other"] as const;
  const rows = [];
  for (const c of cats) {
    const v = optDecimal.safeParse(formObject(fd)[c]);
    if (!v.success) return fail("Algún importe no es válido.");
    rows.push({ company_id: s.profile.companyId, project_id: projectId, category: c, amount: Math.max(0, v.data ?? 0) });
  }
  const { error } = await s.supabase.from("project_cost_estimates").upsert(rows, { onConflict: "project_id,category" });
  if (error) return fail(friendlyError(error));
  revalidatePath("/obras", "layout");
  return { ok: true, message: "Costes previstos guardados." };
}

export async function addExpense(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const p = z
    .object({
      project_id: uuid(),
      category: z.enum(["labor", "subcontract", "travel", "rental", "other"]),
      expense_date: date("Fecha"),
      description: text("Concepto", 200),
      employee_id: optUuid,
      hours: optDecimal,
      hourly_rate: optDecimal,
      amount: optDecimal,
    })
    .safeParse(raw);
  if (!p.success) return invalid(p.error);
  const amount = p.data.amount ?? (p.data.hours && p.data.hourly_rate ? Math.round(p.data.hours * p.data.hourly_rate * 100) / 100 : undefined);
  if (amount === undefined || amount < 0) return { ok: false, message: "Indica el importe o las horas y el coste por hora.", fieldErrors: { amount: ["Obligatorio"] } };
  const { error } = await s.supabase.from("project_expenses").insert({
    company_id: s.profile.companyId, project_id: p.data.project_id, category: p.data.category, expense_date: p.data.expense_date,
    description: p.data.description, employee_id: p.data.employee_id ?? null, hours: p.data.hours ?? null, hourly_rate: p.data.hourly_rate ?? null, amount,
  });
  if (error) return fail(friendlyError(error));
  revalidatePath("/obras", "layout");
  return { ok: true, message: "Gasto añadido." };
}
