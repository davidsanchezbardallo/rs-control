import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { BarList, PeriodBar, ReportTabs, period } from "@/features/reports/components";
import { projectProfit } from "@/features/projects/finance";
import { ACTIVE_PROJECT_STATUSES, PROJECT_STATUS } from "@/lib/labels";
import { formatCurrency, formatCurrencyRounded, formatDate, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Informe de obras" };

export default async function Page(props: PageProps<"/informes/obras">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { desde, hasta } = period(sp);
  const { supabase } = await requireAdmin();
  const [{ data: fin }, { data: inv }] = await Promise.all([
    supabase.from("v_project_financials").select("*").order("code", { ascending: false }),
    supabase.from("v_invoices").select("party_name, base_amount").eq("direction", "issued").neq("status", "void").gte("issue_date", desde).lte("issue_date", hasta),
  ]);
  const rows = (fin ?? []).map((p) => ({ p, f: projectProfit(p) }));
  const active = rows.filter((r) => ACTIVE_PROJECT_STATUSES.includes(r.p.status!));
  const finished = rows.filter((r) => ["finished", "closed"].includes(r.p.status!));
  const byClient = new Map<string, number>();
  for (const i of inv ?? []) byClient.set(i.party_name ?? "—", (byClient.get(i.party_name ?? "—") ?? 0) + Number(i.base_amount));
  const totIncome = rows.reduce((s, r) => s + r.f.realIncome, 0);
  const totCost = rows.reduce((s, r) => s + r.f.realCost, 0);
  const deviations = rows.filter((r) => r.f.costDeviation !== null).sort((a, b) => (b.f.costDeviation ?? 0) - (a.f.costDeviation ?? 0)).slice(0, 8);
  return (
    <div className="space-y-6">
      <PageHeader title="Informe de obras" description="Rentabilidad acumulada de cada obra. Los ingresos por cliente usan el periodo seleccionado." />
      <ReportTabs active="/informes/obras" />
      <PeriodBar path="/informes/obras" desde={desde} hasta={hasta} exportHref="/api/export/obras" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Obras activas" value={String(active.length)} />
        <StatCard label="Obras finalizadas" value={String(finished.length)} />
        <StatCard label="Facturado (todas)" value={formatCurrencyRounded(totIncome)} />
        <StatCard label="Margen global" value={totIncome ? formatPercent((totIncome - totCost) / totIncome) : "—"} detail={formatCurrencyRounded(totIncome - totCost)} />
      </div>
      <Card className="overflow-hidden">
        <CardHeader title="Rentabilidad por obra" description="Costes reales: material del almacén, mano de obra, gastos y facturas de proveedores imputadas." />
        <Table className="mt-3" minWidth={1000}>
          <THead><Th>Obra</Th><Th>Estado</Th><Th align="right">Presupuesto</Th><Th align="right">Facturado</Th><Th align="right">Coste real</Th><Th align="right">Margen</Th><Th align="right">Margen %</Th><Th align="right">Desv. coste</Th></THead>
          <TBody>
            {rows.map(({ p, f }) => (
              <Tr key={p.project_id!}>
                <Td><Link href={`/obras/${p.project_id}?tab=economico`} className="font-medium text-ink hover:text-brand-600">{p.name}</Link><p className="text-[12px] text-muted">{p.code}</p></Td>
                <Td><Badge tone={PROJECT_STATUS[p.status!].tone}>{PROJECT_STATUS[p.status!].label}</Badge></Td>
                <Td align="right">{formatCurrency(f.plannedIncome)}</Td>
                <Td align="right">{formatCurrency(f.realIncome)}</Td>
                <Td align="right">{formatCurrency(f.realCost)}</Td>
                <Td align="right" className={cn("font-medium", f.margin < 0 && "text-danger")}>{formatCurrency(f.margin)}</Td>
                <Td align="right">{f.marginPct === null ? "—" : formatPercent(f.marginPct)}</Td>
                <Td align="right" className={cn((f.costDeviation ?? 0) > 0 ? "text-danger" : "text-success")}>{f.costDeviation === null ? "—" : formatPercent(f.costDeviation, 0)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader title="Ingresos por cliente" description={`${formatDate(desde)} – ${formatDate(hasta)} · base imponible`} /><CardBody><BarList items={[...byClient.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} /></CardBody></Card>
        <Card><CardHeader title="Mayores desviaciones de coste" description="Coste real frente a previsto" /><CardBody><BarList money={false} items={deviations.map((r) => ({ label: `${r.p.code} · ${r.p.name}`, value: Math.round((r.f.costDeviation ?? 0) * 1000) / 10, detail: "%" }))} /></CardBody></Card>
      </div>
    </div>
  );
}
