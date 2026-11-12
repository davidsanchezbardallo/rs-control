import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { PeriodBar, ReportTabs, period } from "@/features/reports/components";
import { formatDate, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Informe de personal" };

export default async function Page(props: PageProps<"/informes/personal">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { desde, hasta } = period(sp);
  const { supabase } = await requireAdmin();
  const [{ data: emps }, { data: asg }, { data: abs }, { data: alerts }, { data: company }] = await Promise.all([
    supabase.from("employees").select("id, first_name, last_name, job_title").neq("status", "inactive").order("first_name"),
    supabase.from("project_assignments").select("employee_id, project:projects(code)").is("end_date", null),
    supabase.from("absences").select("employee_id, kind, days, start_date").eq("status", "approved").gte("start_date", desde).lte("start_date", hasta),
    supabase.from("v_alerts").select("*").in("kind", ["document", "training", "ppe"]).order("due_date"),
    supabase.from("companies").select("settings").single(),
  ]);
  const allowance = Number((company?.settings as { vacation_days_per_year?: number } | null)?.vacation_days_per_year ?? 30);
  return (
    <div className="space-y-6">
      <PageHeader title="Informe de personal" description="Asignaciones actuales, vacaciones del periodo y documentación por renovar." />
      <ReportTabs active="/informes/personal" />
      <PeriodBar path="/informes/personal" desde={desde} hasta={hasta} />
      <Card className="overflow-hidden">
        <CardHeader title="Trabajadores, obras y vacaciones" />
        <Table className="mt-3" minWidth={720}>
          <THead><Th>Trabajador</Th><Th>Obras actuales</Th><Th align="right">Vacaciones (periodo)</Th><Th align="right">Otras ausencias</Th><Th align="right">Vacaciones restantes*</Th></THead>
          <TBody>
            {(emps ?? []).map((e) => {
              const vac = (abs ?? []).filter((a) => a.employee_id === e.id && a.kind === "vacation").reduce((s, a) => s + Number(a.days), 0);
              const other = (abs ?? []).filter((a) => a.employee_id === e.id && a.kind !== "vacation").reduce((s, a) => s + Number(a.days), 0);
              return (
                <Tr key={e.id}>
                  <Td><Link className="font-medium text-ink hover:text-brand-600" href={`/trabajadores/${e.id}`}>{e.first_name} {e.last_name}</Link><p className="text-[12px] text-muted">{e.job_title}</p></Td>
                  <Td className="text-ink-2">{(asg ?? []).filter((a) => a.employee_id === e.id).map((a) => a.project?.code).join(", ") || "—"}</Td>
                  <Td align="right">{formatNumber(vac)}</Td>
                  <Td align="right">{formatNumber(other)}</Td>
                  <Td align="right" className="font-medium">{formatNumber(allowance - vac)}</Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
        <p className="px-6 py-3 text-[12px] text-muted">* Sobre {allowance} días/año configurados, si el periodo es un año natural.</p>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Documentación, formación y EPIs por renovar" description="Caducados o que caducan en los próximos 30 días" />
        <Table className="mt-3" minWidth={600}>
          <THead><Th>Elemento</Th><Th>Trabajador</Th><Th>Fecha</Th><Th>Estado</Th></THead>
          <TBody>
            {(alerts ?? []).map((a, i) => (
              <Tr key={i}><Td><Link className="font-medium hover:text-brand-600" href={a.link ?? "#"}>{a.title}</Link></Td><Td className="text-ink-2">{a.detail}</Td><Td>{a.due_date ? formatDate(a.due_date) : "—"}</Td><Td><Badge tone={a.tone === "danger" ? "danger" : "warning"}>{a.tone === "danger" ? "Caducado" : "Próximo"}</Badge></Td></Tr>
            ))}
            {!alerts?.length && <EmptyRow cols={4}>Todo al día.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
