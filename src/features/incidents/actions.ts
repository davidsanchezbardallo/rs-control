"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth/session";
import { fail, formObject, friendlyError, invalid, type ActionState } from "@/lib/actions";
import { optText, uuid } from "@/lib/validations/common";

export async function updateIncident(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail("Operación reservada a administración.");
  const p = z.object({ id: uuid(), status: z.enum(["open", "in_progress", "resolved"]), resolution: optText(2000) }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { data: inc, error } = await s.supabase
    .from("incidents")
    .update({ status: p.data.status, resolution: p.data.resolution ?? null, resolved_at: p.data.status === "resolved" ? new Date().toISOString() : null })
    .eq("id", p.data.id)
    .select("id")
    .single();
  if (error || !inc) return fail(friendlyError(error));
  // El aviso al trabajador lo genera la base de datos (trigger trg_incidents_status_notify)
  revalidatePath("/incidencias", "layout");
  revalidatePath("/panel");
  return { ok: true, message: "Incidencia actualizada." };
}
