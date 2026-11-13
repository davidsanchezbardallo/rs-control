import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getWorkReport } from "@/features/work-reports/queries";
import { buildWorkReportPdf } from "@/features/work-reports/pdf/build";

/**
 * Descarga del parte en PDF. Usa la sesión del usuario: la base de datos (RLS)
 * decide si puede verlo. El importe solo aparece para administración.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/partes/[id]/pdf">) {
  const s = await getSession();
  if (!s) return new NextResponse("No autorizado", { status: 403 });
  const { id } = await ctx.params;
  const r = await getWorkReport(s.supabase, id);
  if (!r) return new NextResponse("Parte no encontrado", { status: 404 });
  const isAdmin = s.profile.role === "admin";

  const download = async (path: string | null) => {
    if (!path) return null;
    const { data } = await s.supabase.storage.from("signatures").download(path);
    return data ? new Uint8Array(await data.arrayBuffer()) : null;
  };
  const [{ data: company }, billing, clientSignature, companySignature] = await Promise.all([
    s.supabase.from("companies").select("name, trade_name, tagline, tax_id, address, city, phone, phone_2, email").single(),
    isAdmin ? s.supabase.from("work_report_billing").select("amount").eq("report_id", r.id).maybeSingle() : Promise.resolve(null),
    download(r.client_signature_path),
    download(r.company_signature_path),
  ]);
  if (!company) return new NextResponse("Empresa no disponible", { status: 500 });

  const fields: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(r)) if (k.startsWith("client_") || k.startsWith("site_")) fields[k] = typeof v === "string" ? v : null;

  const bytes = await buildWorkReportPdf({
    company,
    report: {
      number: r.number,
      report_date: r.report_date,
      status: r.status,
      work_types: r.work_types,
      maintenance_type: r.maintenance_type,
      project: r.project ? `${r.project.code} · ${r.project.name}` : null,
      employee: r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : null,
      fields,
      lines: r.lines.map((l) => ({ ...l, hours: l.hours == null ? null : Number(l.hours) })),
      work_done: r.work_done,
      observations: r.observations,
      client_signer_name: r.client_signer_name,
      validated_at: r.validated_at,
    },
    amount: isAdmin ? (billing?.data?.amount == null ? null : Number(billing.data.amount)) : undefined,
    clientSignature,
    companySignature,
  });
  const name = `${r.number ?? "parte"}.pdf`.replace(/[^\w.-]/g, "_");
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
