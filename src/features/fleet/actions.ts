"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth/session";
import { fail, formObject, friendlyError, invalid, type ActionState } from "@/lib/actions";
import { date, optDate, optDecimal, optText, optUuid, text, uuid } from "@/lib/validations/common";

const NO = "Operación reservada a administración.";
const nul = <T,>(v: T | undefined) => v ?? null;
const refresh = () => {
  revalidatePath("/vehiculos", "layout");
  revalidatePath("/panel");
  revalidatePath("/mi", "layout");
};
const intOpt = z.string().optional().transform((v) => (v ? Number(v.replace(/\./g, "")) : undefined)).pipe(z.number().int().min(0).optional());

export async function saveVehicle(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const p = z
    .object({
      plate: text("Matrícula", 15).transform((v) => v.toUpperCase()), brand: optText(60), model: optText(60), acquired_on: optDate,
      ownership: z.enum(["owned", "renting", "leasing"]), odometer_km: intOpt, itv_due: optDate, insurance_company: optText(80),
      insurance_policy: optText(60), insurance_due: optDate, next_service_due: optDate, status: z.enum(["active", "workshop", "inactive"]), notes: optText(1000),
    })
    .safeParse(raw);
  if (!p.success) return invalid(p.error);
  const d = p.data;
  const row = { plate: d.plate, brand: nul(d.brand), model: nul(d.model), acquired_on: nul(d.acquired_on), ownership: d.ownership, odometer_km: nul(d.odometer_km), itv_due: nul(d.itv_due), insurance_company: nul(d.insurance_company), insurance_policy: nul(d.insurance_policy), insurance_due: nul(d.insurance_due), next_service_due: nul(d.next_service_due), status: d.status, notes: nul(d.notes) };
  if (raw.id) {
    const { error } = await s.supabase.from("vehicles").update(row).eq("id", raw.id);
    if (error) return fail(friendlyError(error));
    refresh();
    return { ok: true, message: "Vehículo guardado." };
  }
  const { data, error } = await s.supabase.from("vehicles").insert({ ...row, company_id: s.profile.companyId }).select("id").single();
  if (error) return fail(friendlyError(error));
  refresh();
  redirect(`/vehiculos/${data.id}`);
}

export async function addVehicleEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z
    .object({ vehicle_id: uuid(), kind: z.enum(["maintenance", "breakdown", "repair", "inspection", "itv", "other"]), event_date: date("Fecha"), odometer_km: intOpt, description: text("Descripción", 300), cost: optDecimal, supplier_id: optUuid, next_itv: optDate, next_service: optDate })
    .safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const d = p.data;
  const { error } = await s.supabase.from("vehicle_events").insert({ company_id: s.profile.companyId, vehicle_id: d.vehicle_id, kind: d.kind, event_date: d.event_date, odometer_km: nul(d.odometer_km), description: d.description, cost: nul(d.cost), supplier_id: nul(d.supplier_id) });
  if (error) return fail(friendlyError(error));
  const patch: { odometer_km?: number; itv_due?: string; next_service_due?: string } = {};
  if (d.odometer_km) patch.odometer_km = d.odometer_km;
  if (d.next_itv) patch.itv_due = d.next_itv;
  if (d.next_service) patch.next_service_due = d.next_service;
  if (Object.keys(patch).length) await s.supabase.from("vehicles").update(patch).eq("id", d.vehicle_id);
  refresh();
  return { ok: true, message: "Registro añadido." };
}

export async function assignVehicle(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ vehicle_id: uuid(), employee_id: optUuid }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const today = new Date().toISOString().slice(0, 10);
  // Cierra la asignación actual del vehículo
  await s.supabase.from("vehicle_assignments").update({ end_date: today }).eq("vehicle_id", p.data.vehicle_id).is("end_date", null);
  if (p.data.employee_id) {
    await s.supabase.from("vehicle_assignments").update({ end_date: today }).eq("employee_id", p.data.employee_id).is("end_date", null);
    const { error } = await s.supabase.from("vehicle_assignments").insert({ company_id: s.profile.companyId, vehicle_id: p.data.vehicle_id, employee_id: p.data.employee_id });
    if (error) return fail(friendlyError(error));
  }
  refresh();
  return { ok: true, message: p.data.employee_id ? "Vehículo asignado." : "Vehículo sin asignar." };
}

export async function saveTool(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const p = z.object({ code: text("Código", 20).transform((v) => v.toUpperCase()), name: text("Nombre", 120), brand: optText(60), model: optText(60), serial_number: optText(80), purchased_on: optDate, location: optText(80), notes: optText(1000) }).safeParse(raw);
  if (!p.success) return invalid(p.error);
  const d = p.data;
  const row = { code: d.code, name: d.name, brand: nul(d.brand), model: nul(d.model), serial_number: nul(d.serial_number), purchased_on: nul(d.purchased_on), location: d.location ?? "Nave", notes: nul(d.notes) };
  const { error } = raw.id ? await s.supabase.from("tools").update(row).eq("id", raw.id) : await s.supabase.from("tools").insert({ ...row, company_id: s.profile.companyId });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Herramienta guardada." };
}

export async function assignTool(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ tool_id: uuid(), employee_id: uuid("Trabajador"), project_id: optUuid, condition: optText(200) }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { error } = await s.supabase.rpc("tool_assign", { p_tool: p.data.tool_id, p_employee: p.data.employee_id, p_project: p.data.project_id, p_condition: p.data.condition });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Herramienta entregada." };
}

export async function returnTool(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ tool_id: uuid(), condition: optText(200), status: z.enum(["available", "repair", "lost", "retired"]).default("available") }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { error } = await s.supabase.rpc("tool_return", { p_tool: p.data.tool_id, p_condition: p.data.condition, p_status: p.data.status });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Devolución registrada." };
}
