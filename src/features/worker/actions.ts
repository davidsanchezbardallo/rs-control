"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { fail, formObject, friendlyError, invalid, type ActionState } from "@/lib/actions";
import { optText, optUuid, text, uuid } from "@/lib/validations/common";

function refresh() {
  revalidatePath("/mi", "layout");
  revalidatePath("/obras", "layout");
  revalidatePath("/vehiculos", "layout");
}

export async function joinProject(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = z.object({ project_id: uuid("Obra") }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { error } = await supabase.rpc("worker_join_project", { p_project: parsed.data.project_id });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Obra añadida." };
}

export async function leaveProject(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = z.object({ project_id: uuid("Obra") }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { error } = await supabase.rpc("worker_leave_project", { p_project: parsed.data.project_id });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Has dejado la obra." };
}

export async function setVehicle(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = z.object({ vehicle_id: optUuid }).safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { error } = await supabase.rpc("worker_set_vehicle", { p_vehicle: (parsed.data.vehicle_id ?? null) as string });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: parsed.data.vehicle_id ? "Vehículo actualizado." : "Ya no llevas vehículo asignado." };
}

const incidentSchema = z
  .object({
    project_id: optUuid,
    vehicle_id: optUuid,
    title: text("Título", 140).pipe(z.string().min(3, "El título es demasiado corto")),
    description: optText(2000),
    severity: z.enum(["low", "medium", "high"]).default("medium"),
    photos: z.string().optional(),
  })
  .refine((v) => v.project_id || v.vehicle_id, { message: "Indica la obra o el vehículo", path: ["project_id"] });

export async function createIncident(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireUser();
  const parsed = incidentSchema.safeParse(formObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const photos = (parsed.data.photos ?? "")
    .split("|")
    .filter(Boolean)
    // Solo rutas dentro de la carpeta del propio usuario
    .filter((p) => p.startsWith(`${profile.id}/`) && !p.includes(".."))
    .slice(0, 6);
  const { error } = await supabase.from("incidents").insert({
    company_id: profile.companyId,
    project_id: parsed.data.project_id ?? null,
    vehicle_id: parsed.data.vehicle_id ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    severity: parsed.data.severity,
    photo_paths: photos,
    reported_by: profile.id,
  });
  if (error) return fail(friendlyError(error));
  refresh();
  revalidatePath("/incidencias");
  redirect(profile.role === "admin" ? "/incidencias" : "/mi/incidencias?ok=1");
}
