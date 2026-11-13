import { z } from "zod";

/** Datos de un parte de trabajo (validados en el servidor). */
const t = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida (HH:MM)")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const lineSchema = z.object({
  description: z.string().trim().min(1, "Describe la orden de trabajo").max(500),
  technician_name: t(120),
  start_time: time,
  end_time: time,
});

export const WORK_TYPES = ["breakdown", "installation", "renovation", "extension", "image_processing"] as const;

export const workReportSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string({ error: "Elige la obra" }).uuid("Elige la obra"),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida"),
  work_types: z.array(z.enum(WORK_TYPES)).max(5).default([]),
  client_name: t(200),
  client_tax_id: t(20),
  client_legal_rep: t(160),
  client_legal_rep_tax_id: t(20),
  client_address: t(200),
  client_city: t(80),
  client_province: t(80),
  client_postal_code: t(10),
  client_phone: t(30),
  client_email: z.string().trim().max(160).optional().transform((v) => (v ? v : null)).pipe(z.string().email("Email no válido").nullable()),
  site_name: t(200),
  site_contact: t(160),
  site_address: t(200),
  site_phone: t(30),
  site_city: t(80),
  site_province: t(80),
  site_postal_code: t(10),
  work_done: t(8000),
  observations: t(8000),
  maintenance_type: z.enum(["basic", "premium", "none"]).optional().nullable(),
  client_signer_name: t(160),
  client_signature_path: t(300),
  company_signature_path: t(300),
  lines: z.array(lineSchema).max(30, "Máximo 30 líneas"),
  intent: z.enum(["draft", "submit", "save"]).default("save"),
});

export type WorkReportInput = z.input<typeof workReportSchema>;

/** Horas entre dos horas HH:MM (si la final es menor, cruza medianoche). */
export function hoursBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  let mins = h2! * 60 + m2! - (h1! * 60 + m1!);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}

/** Campos obligatorios para enviar (o guardar en firme) un parte. Los borradores no se comprueban. */
export type MissingField = { field: "project_id" | "report_date" | "work_types" | "lines" | "company_signature_path"; message: string };
export function missingForSubmit(d: {
  project_id?: string | null;
  report_date?: string | null;
  work_types?: readonly string[] | null;
  lines?: readonly { description?: string | null }[] | null;
  company_signature_path?: string | null;
}): MissingField[] {
  const out: MissingField[] = [];
  if (!d.project_id) out.push({ field: "project_id", message: "Elige la obra." });
  if (!d.report_date) out.push({ field: "report_date", message: "Indica la fecha." });
  if (!d.work_types?.length) out.push({ field: "work_types", message: "Marca al menos un tipo de trabajo." });
  if (!d.lines?.some((l) => l.description?.trim())) out.push({ field: "lines", message: "Añade al menos un trabajo en la orden de trabajo." });
  if (!d.company_signature_path) out.push({ field: "company_signature_path", message: "Falta la firma del trabajador." });
  return out;
}

/** Datos del cliente y de la instalación que se copian de la ficha de la obra. */
export const CLIENT_SITE_FIELDS = [
  "client_name", "client_tax_id", "client_legal_rep", "client_legal_rep_tax_id", "client_address", "client_city", "client_province", "client_postal_code", "client_phone", "client_email",
  "site_name", "site_contact", "site_address", "site_phone", "site_city", "site_province", "site_postal_code",
] as const;
