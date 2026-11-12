"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminOrNull, getSession } from "@/lib/auth/session";
import { fail, formObject, friendlyError, invalid, orNull, type ActionState } from "@/lib/actions";
import { date, decimal, materialLines, optDate, optText, optUuid, text, uuid } from "@/lib/validations/common";

const NO_ADMIN = "Operación reservada a administración.";

function refresh() {
  revalidatePath("/almacen", "layout");
  revalidatePath("/panel");
  revalidatePath("/mi", "layout");
}

// ---------------------------------------------------------------- Catálogo
const materialSchema = z.object({
  code: text("Código", 40),
  name: text("Nombre", 160),
  description: optText(1000),
  category_id: optUuid,
  brand: optText(80),
  model_ref: optText(80),
  unit_id: uuid("Unidad"),
  min_stock: decimal("Stock mínimo").pipe(z.number().min(0, "El stock mínimo no puede ser negativo")),
  default_supplier_id: optUuid,
  location: optText(60),
  status: z.enum(["active", "discontinued"]).default("active"),
});

export async function saveMaterial(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO_ADMIN);
  const raw = formObject(fd);
  const parsed = materialSchema.safeParse({ ...raw, min_stock: raw.min_stock ?? "0" });
  if (!parsed.success) return invalid(parsed.error);
  const row = {
    ...parsed.data,
    code: parsed.data.code.toUpperCase(),
    description: parsed.data.description ?? null,
    category_id: parsed.data.category_id ?? null,
    brand: parsed.data.brand ?? null,
    model_ref: parsed.data.model_ref ?? null,
    default_supplier_id: parsed.data.default_supplier_id ?? null,
    location: parsed.data.location ?? null,
  };
  const id = raw.id;
  const { data, error } = id
    ? await s.supabase.from("materials").update(row).eq("id", id).select("id").single()
    : await s.supabase.from("materials").insert({ ...row, company_id: s.profile.companyId }).select("id").single();
  if (error) return fail(friendlyError(error));
  refresh();
  if (!id) redirect(`/almacen/materiales/${data.id}`);
  return { ok: true, message: "Material guardado." };
}

// ---------------------------------------------------------------- Entradas
const purchaseSchema = z.object({
  supplier_id: optUuid,
  reference: optText(80),
  date: date("Fecha"),
  notes: optText(1000),
  lines: materialLines,
});

export async function registerPurchase(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO_ADMIN);
  const parsed = purchaseSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.lines.some((l) => !l.material_id || l.unit_cost === undefined)) return fail("Cada línea necesita material y precio.");
  const { data, error } = await s.supabase.rpc("inv_purchase", {
    p_supplier: orNull(parsed.data.supplier_id),
    p_reference: orNull(parsed.data.reference),
    p_lines: parsed.data.lines,
    p_notes: parsed.data.notes,
    p_date: parsed.data.date,
  });
  if (error) return fail(friendlyError(error));
  refresh();
  redirect(`/almacen/movimientos/${data}?ok=1`);
}

// ---------------------------------------------------------------- Salidas
const issueSchema = z.object({
  project_id: uuid("Obra"),
  employee_id: optUuid,
  request_id: optUuid,
  notes: optText(1000),
  lines: materialLines,
});

/** Salida de material a obra. Válida para administración y para trabajadores (registro directo). */
export async function registerIssue(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) return fail("Sesión caducada. Vuelve a entrar.");
  const parsed = issueSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const isAdmin = s.profile.role === "admin";
  const { data, error } = await s.supabase.rpc("inv_issue", {
    p_project: parsed.data.project_id,
    p_lines: parsed.data.lines.map((l) => ({ material_id: l.material_id, quantity: l.quantity })),
    p_notes: parsed.data.notes,
    p_employee: isAdmin ? parsed.data.employee_id : undefined,
    p_request: isAdmin ? parsed.data.request_id : undefined,
  });
  if (error) return fail(friendlyError(error));
  refresh();
  if (isAdmin) redirect(`/almacen/movimientos/${data}?ok=1`);
  redirect(`/mi/movimientos?ok=salida`);
}

// ---------------------------------------------------------------- Devoluciones
const returnSchema = z.object({
  project_id: uuid("Obra"),
  employee_id: optUuid,
  notes: optText(1000),
  lines: materialLines,
});

export async function registerReturn(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) return fail("Sesión caducada. Vuelve a entrar.");
  const parsed = returnSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const isAdmin = s.profile.role === "admin";
  const { data, error } = await s.supabase.rpc("inv_return", {
    p_project: parsed.data.project_id,
    p_lines: parsed.data.lines.map((l) => ({ material_id: l.material_id, quantity: l.quantity, condition: l.condition ?? "ok" })),
    p_notes: parsed.data.notes,
    p_employee: isAdmin ? parsed.data.employee_id : undefined,
  });
  if (error) return fail(friendlyError(error));
  refresh();
  if (isAdmin) redirect(`/almacen/movimientos/${data}?ok=1`);
  redirect(`/mi/movimientos?ok=devolucion`);
}

// ---------------------------------------------------------------- Ajustes
const adjustSchema = z.object({
  material_id: uuid("Material"),
  direction: z.enum(["in", "out"], { error: "Indica si suma o resta" }),
  quantity: decimal("Cantidad").pipe(z.number().positive("La cantidad debe ser mayor que cero")),
  reason: z.enum(["loss", "breakage", "defective", "count_difference", "entry_error", "other"], { error: "Elige un motivo" }),
  justification: z.string().trim().min(5, "Escribe una justificación (mínimo 5 caracteres)").max(1000),
});

export async function registerAdjustment(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO_ADMIN);
  const parsed = adjustSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const q = parsed.data.direction === "in" ? parsed.data.quantity : -parsed.data.quantity;
  const { data, error } = await s.supabase.rpc("inv_adjust", {
    p_material: parsed.data.material_id,
    p_quantity: q,
    p_reason: parsed.data.reason,
    p_justification: parsed.data.justification,
  });
  if (error) return fail(friendlyError(error));
  refresh();
  redirect(`/almacen/movimientos/${data}?ok=1`);
}

// ---------------------------------------------------------------- Anulación
export async function reverseDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO_ADMIN);
  const parsed = z.object({ document_id: uuid(), reason: z.string().trim().min(5, "Indica el motivo (mínimo 5 caracteres)").max(500) }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { data, error } = await s.supabase.rpc("inv_reverse", { p_document: parsed.data.document_id, p_reason: parsed.data.reason });
  if (error) return fail(friendlyError(error));
  refresh();
  redirect(`/almacen/movimientos/${data}?ok=1`);
}

// ---------------------------------------------------------------- Solicitudes
const requestSchema = z.object({
  project_id: uuid("Obra"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  needed_by: optDate,
  notes: optText(1000),
  lines: materialLines,
});

export async function createRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) return fail("Sesión caducada. Vuelve a entrar.");
  const parsed = requestSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { data, error } = await s.supabase.rpc("request_create", {
    p_project: parsed.data.project_id,
    p_items: parsed.data.lines.map((l) => ({ material_id: l.material_id, free_text: l.free_text, quantity: l.quantity })),
    p_priority: parsed.data.priority,
    p_needed_by: parsed.data.needed_by,
    p_notes: parsed.data.notes,
  });
  if (error) return fail(friendlyError(error));
  refresh();
  redirect(s.profile.role === "admin" ? `/almacen/solicitudes/${data}` : `/mi/material?ok=solicitud`);
}

export async function setRequestStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) return fail("Sesión caducada. Vuelve a entrar.");
  const parsed = z
    .object({
      request_id: uuid(),
      status: z.enum(["in_review", "approved", "prepared", "rejected", "cancelled"]),
      reason: optText(500),
    })
    .safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { error } = await s.supabase.rpc("request_set_status", {
    p_request: parsed.data.request_id,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason,
  });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Solicitud actualizada." };
}

// ---------------------------------------------------------------- Recepción
export async function confirmReception(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) return fail("Sesión caducada. Vuelve a entrar.");
  const id = String(fd.get("document_id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return fail("Documento no válido.");
  const { error } = await s.supabase.rpc("inv_confirm_reception", { p_document: id });
  if (error) return fail(friendlyError(error));
  refresh();
  if (s.profile.role === "admin") return { ok: true, message: "Recepción confirmada." };
  redirect("/mi?ok=recepcion");
}
