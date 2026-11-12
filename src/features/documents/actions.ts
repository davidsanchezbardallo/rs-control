"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth/session";
import { fail, friendlyError, type ActionState } from "@/lib/actions";

const ALLOWED = [
  "application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ENTITY = z.enum(["employee", "project", "vehicle", "invoice", "company"]);

/** Paso 1: el servidor (tras comprobar que es admin) genera una URL firmada de subida de un solo uso. */
export async function prepareUpload(input: { entity: string; entityId?: string; filename: string; mime: string; size: number }) {
  const s = await getAdminOrNull();
  if (!s) return { error: "Operación reservada a administración." };
  const entity = ENTITY.safeParse(input.entity);
  if (!entity.success) return { error: "Tipo de documento no válido." };
  if (!ALLOWED.includes(input.mime)) return { error: "Formato no permitido. Usa PDF, imagen, Excel o Word." };
  if (input.size > 25 * 1024 * 1024) return { error: "El archivo supera 25 MB." };
  const ext = (input.filename.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const path = `${s.profile.companyId}/${entity.data}/${input.entityId ?? "general"}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await s.supabase.storage.from("documents").createSignedUploadUrl(path);
  if (error) return { error: "No se ha podido preparar la subida." };
  return { path, token: data.token };
}

const registerSchema = z.object({
  entity: ENTITY,
  entityId: z.string().uuid().optional(),
  path: z.string().min(10).max(300),
  title: z.string().trim().min(2, "Escribe un título").max(160),
  category: z.string(),
  mime: z.string().max(120),
  size: z.number().int().nonnegative(),
  issued_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Paso 2: tras subir el archivo, se registran sus datos. */
export async function registerDocument(input: z.input<typeof registerSchema>): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail("Operación reservada a administración.");
  const p = registerSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]!.message);
  if (!p.data.path.startsWith(`${s.profile.companyId}/${p.data.entity}/`)) return fail("Ruta de archivo no válida.");
  const link = p.data.entity === "company" ? {} : { [`${p.data.entity}_id`]: p.data.entityId };
  const { error } = await s.supabase.from("documents").insert({
    company_id: s.profile.companyId,
    title: p.data.title,
    category: p.data.category as never,
    storage_path: p.data.path,
    mime_type: p.data.mime,
    size_bytes: p.data.size,
    issued_on: p.data.issued_on ?? null,
    expires_on: p.data.expires_on ?? null,
    ...link,
  });
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return { ok: true, message: "Documento guardado." };
}

export async function deleteDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail("Operación reservada a administración.");
  const id = String(fd.get("id") ?? "");
  const { data: doc } = await s.supabase.from("documents").select("storage_path").eq("id", id).maybeSingle();
  if (!doc) return fail("Documento no encontrado.");
  await s.supabase.storage.from("documents").remove([doc.storage_path]);
  const { error } = await s.supabase.from("documents").delete().eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return { ok: true, message: "Documento eliminado." };
}
