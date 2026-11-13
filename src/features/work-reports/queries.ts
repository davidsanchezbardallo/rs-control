import "server-only";
import type { Supabase } from "@/lib/supabase/server";

export const REPORT_COLUMNS =
  "id, number, project_id, employee_id, report_date, work_types, client_name, client_tax_id, client_legal_rep, client_legal_rep_tax_id, client_address, client_city, client_province, client_postal_code, client_phone, client_email, site_name, site_contact, site_address, site_phone, site_city, site_province, site_postal_code, work_done, observations, maintenance_type, client_signer_name, client_signature_path, company_signature_path, signed_at, status, submitted_at, validated_at, created_at, updated_at";

/** Parte con sus líneas (RLS decide si el usuario puede verlo). */
export async function getWorkReport(supabase: Supabase, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await supabase
    .from("work_reports")
    .select(`${REPORT_COLUMNS}, project:projects(code, name), employee:employees(first_name, last_name), lines:work_report_lines(position, description, technician_name, start_time, end_time, hours)`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  data.lines.sort((a, b) => a.position - b.position);
  return data;
}
export type WorkReport = NonNullable<Awaited<ReturnType<typeof getWorkReport>>>;

/** Valores del formulario a partir de un parte guardado. */
export function toFormData(r: WorkReport) {
  const skip = new Set(["lines", "project", "employee"]);
  return Object.fromEntries(Object.entries(r).filter(([k]) => !skip.has(k))) as Record<string, string | null> & { work_types?: string[] };
}
