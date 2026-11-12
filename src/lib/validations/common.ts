import { z } from "zod";

/** Esquemas reutilizables con mensajes en español. */
export const text = (label: string, max = 200) =>
  z.string({ error: `${label} es obligatorio` }).trim().min(1, `${label} es obligatorio`).max(max, `${label}: máximo ${max} caracteres`);
export const optText = (max = 2000) => z.string().trim().max(max).optional();
export const uuid = (label = "Selección") => z.string({ error: `${label} es obligatorio` }).uuid(`${label} no válido`);
export const optUuid = z.string().uuid().optional();

/** Convierte "1.234,56" o "1234.56" en número. */
export function parseDecimal(v: string): number {
  const s = v.trim();
  if (s.includes(",")) return Number(s.replace(/\./g, "").replace(",", "."));
  return Number(s);
}
export const decimal = (label: string) =>
  z
    .string({ error: `${label} es obligatorio` })
    .transform(parseDecimal)
    .pipe(z.number({ error: `${label} no es un número` }).finite(`${label} no es un número`));
export const optDecimal = z
  .string()
  .optional()
  .transform((v) => (v === undefined ? undefined : parseDecimal(v)))
  .pipe(z.number().finite("Número no válido").optional());
export const date = (label: string) => z.string({ error: `${label} es obligatoria` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${label} no válida`);
export const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida").optional();

/** Líneas de material enviadas por los formularios (JSON en un campo oculto). */
export const materialLines = z
  .string({ error: "Añade al menos un material" })
  .transform((s, ctx) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Líneas no válidas" });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(
        z.object({
          material_id: z.string().uuid().optional(),
          free_text: z.string().trim().max(200).optional(),
          quantity: z.number().positive("Las cantidades deben ser mayores que cero"),
          unit_cost: z.number().min(0).optional(),
          condition: z.enum(["ok", "damaged"]).optional(),
        }),
      )
      .min(1, "Añade al menos un material"),
  );
