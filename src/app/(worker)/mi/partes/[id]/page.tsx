import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { OkBanner } from "@/components/layout/WorkerUi";
import { BackLink } from "@/components/ui/BackLink";
import { Badge } from "@/components/ui/Badge";
import { WorkReportForm } from "@/features/work-reports/components/WorkReportForm";
import { WorkReportView } from "@/features/work-reports/components/WorkReportView";
import { DeleteDraftButton } from "@/features/work-reports/components/DeleteDraftButton";
import { getWorkReport, toFormData } from "@/features/work-reports/queries";
import { activeProjectOptions, todayISO } from "@/features/lookups";
import { WORK_REPORT_STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Parte de trabajo" };

const OK: Record<string, string> = {
  enviado: "Parte enviado a administración.",
  guardado: "Borrador guardado. Puedes terminarlo más tarde.",
};

export default async function Page(props: PageProps<"/mi/partes/[id]">) {
  const { id } = await props.params;
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase, profile } = await requireUser();
  const [r, projects] = await Promise.all([getWorkReport(supabase, id), activeProjectOptions(supabase)]);
  if (!r) notFound();
  const st = WORK_REPORT_STATUS[r.status];
  // La obra del parte siempre aparece, aunque ya no esté activa
  const options = projects.some((p) => p.value === r.project_id) || !r.project ? projects : [{ value: r.project_id, label: `${r.project.code} · ${r.project.name}` }, ...projects];

  return (
    <WorkerPage title={r.number ?? "Parte de trabajo"} subtitle={<span className="inline-flex items-center gap-2">{formatDate(r.report_date)} <Badge tone={st.tone}>{st.label}</Badge></span>}>
      <BackLink href="/mi/partes">Partes</BackLink>
      {sp.ok && OK[sp.ok] && <OkBanner>{OK[sp.ok]}</OkBanner>}
      <a href={`/api/partes/${r.id}/pdf`} className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-canvas text-[15px] font-medium text-brand-600 shadow-card ring-1 ring-line/70">
        <Download className="h-4 w-4" aria-hidden="true" /> Descargar PDF
      </a>
      {r.status === "validated" ? (
        <>
          <p className="rounded-[var(--radius-lg)] bg-success-soft px-4 py-3 text-[14px] text-success">Validado por administración. Ya no se puede modificar.</p>
          <WorkReportView r={r} />
        </>
      ) : (
        <>
          {r.status === "submitted" && <p className="rounded-[var(--radius-lg)] bg-brand-50 px-4 py-3 text-[14px] text-brand-700">Enviado. Puedes corregirlo hasta que administración lo valide.</p>}
          <WorkReportForm projects={options} initial={toFormData(r)} initialLines={r.lines} userId={profile.id} myName={profile.fullName} today={todayISO()} mode="worker" status={r.status} />
          {r.status === "draft" && <DeleteDraftButton id={r.id} />}
        </>
      )}
    </WorkerPage>
  );
}
