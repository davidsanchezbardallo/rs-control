import type { PostgrestError } from "@supabase/supabase-js";
import type { z } from "zod";

/** Resultado estándar de una acción de formulario. */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const idle: ActionState = { ok: false };

/** Traduce errores técnicos a mensajes claros (sin filtrar detalles internos). */
export function friendlyError(error: PostgrestError | { message: string; code?: string } | null | undefined): string {
  if (!error) return "Error desconocido";
  const code = "code" in error ? error.code : undefined;
  if (code === "42501") return "No tienes permiso para realizar esta operación.";
  if (code === "23505") return "Ya existe un registro con ese código o número.";
  if (code === "23503") return "El registro está relacionado con otros datos y no se puede completar la operación.";
  if (code === "23514" || code === "22P02") return "Algún dato no es válido. Revisa el formulario.";
  if (code === "P0001" || !code) return error.message; // mensajes de negocio escritos en español en la BD
  console.error("[RS Control] error de base de datos", code, error.message);
  return "No se ha podido completar la operación. Inténtalo de nuevo.";
}

export function fail(message: string): ActionState {
  return { ok: false, message };
}

export function invalid(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, message: "Revisa los campos marcados.", fieldErrors };
}

/** Convierte FormData en objeto plano (campos vacíos -> undefined). */
export function formObject(fd: FormData): Record<string, string | undefined> {
  const o: Record<string, string | undefined> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") o[k] = v.trim() === "" ? undefined : v.trim();
  }
  return o;
}

/**
 * Para parámetros de funciones SQL que admiten NULL pero no tienen valor por
 * defecto (los tipos generados los marcan como obligatorios).
 */
export function orNull<T>(v: T | undefined | null): T {
  return (v ?? null) as T;
}
