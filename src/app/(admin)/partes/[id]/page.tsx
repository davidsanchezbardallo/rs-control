import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { WorkReportForm } from "@/features/work-reports/components/WorkReportForm";
import { WorkReportAmountForm, WorkReportStatusForm } from "@/features/work-reports/components/AdminPanel";
import { DeleteDraftButton } from "@/features/work-reports/components/DeleteDraftButton";
import { getWorkReport, toFormData } from "@/features/work-reports/queries";
import { projectOptions, todayISO } from "@/features/lookups";
import { WORK_REPORT_STATUS } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Parte de trabajo" };

export default async function Page(props: PageProps<"/partes/[id]">) {
  const { id } = await props.params;
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase, profile } = await requireAdmin();
  const [r, projects] = await Promise.all([getWorkReport(supabase, id), projectOptions(supabase)]);
  if (!r) notFound();
  const { data: billing } = await supabase.from("work_report_billing").select("amount").eq("report_id", r.id).maybeSingle();
  const st = WORK_REPORT_STATUS[r.status];

  return (
    <div className="space-y-6">
      <BackLink href="/partes">Partes de trabajo</BackLink>
      <PageHeader
        eyebrow={<Badge tone={st.tone}>{st.label}</Badge>}
        title={r.number ?? "Parte de trabajo"}
        description={`${formatDate(r.report_date)}${r.project ? ` · ${r.project.code} · ${r.project.name}` : ""}`}
        actions={<a href={`/api/partes/${r.id}/pdf`} className={buttonClasses({ variant: "secondary" })}><Download className="h-4 w-4" aria-hidden="true" /> Descargar PDF</a>}
      />
      {sp.ok === "guardado" && <p role="status" className="rounded-[var(--radius-lg)] bg-success-soft px-4 py-3 text-[14px] font-medium text-success">Parte guardado.</p>}
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WorkReportForm projects={projects} initial={toFormData(r)} initialLines={r.lines} userId={profile.id} myName={profile.fullName} today={todayISO()} mode="admin" status={r.status} />
        </div>
        <div className="space-y-6 xl:sticky xl:top-20">
          <Card>
            <CardHeader title="Revisión" />
            <CardBody className="space-y-4">
              <DescriptionList
                columns={1}
                items={[
                  { label: "Trabajador", value: r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : "Administración" },
                  { label: "Obra", value: r.project && <Link className="text-brand-600" href={`/obras/${r.project_id}`}>{r.project.code} · {r.project.name}</Link> },
                  { label: "Enviado", value: r.submitted_at ? formatDateTime(r.submitted_at) : "Sin enviar (borrador)" },
                  { label: "Validado", value: r.validated_at ? formatDateTime(r.validated_at) : "—" },
                ]}
              />
              <WorkReportStatusForm id={r.id} status={r.status} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Importe" />
            <CardBody><WorkReportAmountForm id={r.id} amount={billing?.amount == null ? null : Number(billing.amount)} /></CardBody>
          </Card>
          {r.status === "draft" && <DeleteDraftButton id={r.id} />}
        </div>
      </div>
    </div>
  );
}
