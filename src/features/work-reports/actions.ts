"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminOrNull, getSession } from "@/lib/auth/session";
import { fail, friendlyError, invalid, type ActionState } from "@/lib/actions";
import { optDecimal } from "@/lib/validations/common";
import { CLIENT_SITE_FIELDS, missingForSubmit, workReportSchema } from "./schema";

const refresh = () => {
  revalidatePath("/mi", "layout");
  revalidatePath("/partes", "layout");
  revalidatePath("/obras", "layout");
};

/** Datos para autocompletar el parte al elegir la obra (cliente, instalación y equipo). */
export async function getPrefill(projectId: string) {
  const s = await getSession();
  if (!s || !z.string().uuid().safeParse(projectId).success) return null;
  const { data } = await s.supabase.rpc("work_report_prefill", { p_project: projectId });
  return (data as Record<string, string | null | string[]> | null) ?? null;
}

/**
 * Guarda un parte (nuevo o existente) con sus líneas en una sola transacción.
 * El formulario envía los datos como JSON en el campo "data".
 */
export async function saveWorkReport(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) return fail("Sesión caducada. Vuelve a entrar.");
  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("data") ?? "{}"));
  } catch {
    return fail("Datos no válidos.");
  }
  const intent = fd.get("intent");
  const p = workReportSchema.safeParse({ ...(raw as object), intent: intent ?? "save" });
  if (!p.success) return invalid(p.error);
  const isAdmin = s.profile.role === "admin";
  if (!isAdmin && !s.profile.employeeId) return fail("Tu usuario no está vinculado a una ficha de trabajador.");

  // Las firmas solo pueden apuntar a la carpeta del propio usuario (salvo administración)
  for (const path of [p.data.client_signature_path, p.data.company_signature_path]) {
    if (path && (path.includes("..") || (!isAdmin && !path.startsWith(`${s.profile.id}/`)))) {
      // Si el trabajador no ha cambiado la firma existente, se acepta tal cual
      if (p.data.id) {
        const { data: cur } = await s.supabase.from("work_reports").select("client_signature_path, company_signature_path").eq("id", p.data.id).maybeSingle();
        if (cur && (cur.client_signature_path === path || cur.company_signature_path === path)) continue;
      }
      return fail("Firma no válida. Vuelve a firmar.");
    }
  }

  const { lines, intent: it, ...report } = p.data;
  // Obligatorios: obra, fecha, tipo de trabajo, orden de trabajo y firma del trabajador (la del cliente es opcional)
  if (it !== "draft") {
    const missing = missingForSubmit(p.data);
    if (missing.length) {
      return {
        ok: false,
        message: `Falta completar: ${missing.map((m) => m.message.replace(/\.$/, "").toLowerCase()).join(", ")}.`,
        fieldErrors: Object.fromEntries(missing.map((m) => [m.field, [m.message]])),
      };
    }
  }

  // El trabajador no conoce los datos del cliente: se toman de la ficha de la obra.
  // Al crear el parte o cambiar de obra se copian de la obra; si no, se conservan los guardados.
  if (!isAdmin) {
    let source: Record<string, unknown> | null = null;
    if (report.id) {
      const { data: cur } = await s.supabase.from("work_reports").select("*").eq("id", report.id).maybeSingle();
      if (cur && cur.project_id === report.project_id) source = cur;
    }
    if (!source) {
      const { data: pf } = await s.supabase.rpc("work_report_prefill", { p_project: report.project_id });
      source = (pf as Record<string, unknown> | null) ?? {};
    }
    for (const k of CLIENT_SITE_FIELDS) (report as Record<string, unknown>)[k] = (source[k] as string | null | undefined) ?? null;
  }

  const status = it === "submit" ? "submitted" : it === "draft" ? "draft" : undefined;
  const { data: id, error } = await s.supabase.rpc("work_report_save", {
    p_report: report,
    p_lines: lines.map((l) => ({ ...l, start_time: l.start_time ?? "", end_time: l.end_time ?? "" })),
    p_status: status,
  });
  if (error || !id) return fail(friendlyError(error));
  refresh();
  if (isAdmin) {
    if (!p.data.id) redirect(`/partes/${id}?ok=guardado`);
    return { ok: true, message: "Parte guardado." };
  }
  redirect(`/mi/partes/${id}?ok=${it === "submit" ? "enviado" : "guardado"}`);
}

export async function deleteDraft(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) return fail("Sesión caducada.");
  const id = String(fd.get("id") ?? "");
  const { data, error } = await s.supabase.from("work_reports").delete().eq("id", id).eq("status", "draft").select("id");
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Solo se pueden borrar los borradores.");
  refresh();
  redirect(s.profile.role === "admin" ? "/partes" : "/mi/partes?ok=borrado");
}

/** Administración: validar o devolver un parte para que el trabajador lo corrija. */
export async function setWorkReportStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail("Operación reservada a administración.");
  const p = z.object({ id: z.string().uuid(), status: z.enum(["validated", "submitted"]) }).safeParse({ id: fd.get("id"), status: fd.get("status") });
  if (!p.success) return fail("Datos no válidos.");
  const { error } = await s.supabase.from("work_reports").update({ status: p.data.status }).eq("id", p.data.id);
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: p.data.status === "validated" ? "Parte validado. El trabajador ya no puede modificarlo." : "Parte devuelto: el trabajador puede corregirlo." };
}

/** Administración: importe del parte (IVA no incluido). Los trabajadores nunca lo ven. */
export async function setWorkReportAmount(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail("Operación reservada a administración.");
  const p = z.object({ id: z.string().uuid(), amount: optDecimal }).safeParse({ id: fd.get("id"), amount: (fd.get("amount") as string) || undefined });
  if (!p.success || (p.data.amount !== undefined && p.data.amount < 0)) return fail("Importe no válido.");
  const { error } = await s.supabase
    .from("work_report_billing")
    .upsert({ report_id: p.data.id, company_id: s.profile.companyId, amount: p.data.amount ?? null, updated_by: s.profile.id, updated_at: new Date().toISOString() });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Importe guardado." };
}
