import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { BarList, PeriodBar, ReportTabs, period } from "@/features/reports/components";
import { formatCurrency, formatCurrencyRounded, formatDate, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Informe de almacén" };

export default async function Page(props: PageProps<"/informes/almacen">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { desde, hasta } = period(sp);
  const { supabase } = await requireAdmin();
  const [{ data: stock }, { data: moves }] = await Promise.all([
    supabase.from("v_stock").select("*").eq("status", "active"),
    supabase.from("stock_movements").select("movement_type, quantity, project_delta, unit_cost, total_cost, is_reversal, material_id, material:materials(code, name, unit:units(code)), project:projects(id, code, name), employee:employees(id, first_name, last_name), document:inventory_documents(supplier:suppliers(name))").gte("occurred_at", desde).lte("occurred_at", `${hasta}T23:59:59`).limit(20000),
  ]);
  const value = (stock ?? []).reduce((s, m) => s + Number(m.stock_value), 0);
  const byCat = new Map<string, number>();
  for (const m of stock ?? []) byCat.set(m.category_name ?? "Sin categoría", (byCat.get(m.category_name ?? "Sin categoría") ?? 0) + Number(m.stock_value));
  const sumBy = <K,>(key: (m: NonNullable<typeof moves>[number]) => K | null, val: (m: NonNullable<typeof moves>[number]) => number) => {
    const map = new Map<K, number>();
    for (const m of moves ?? []) {
      const k = key(m);
      if (k !== null) map.set(k, (map.get(k) ?? 0) + val(m));
    }
    return map;
  };
  const cost = (m: NonNullable<typeof moves>[number]) => Number(m.project_delta) * Number(m.unit_cost);
  const byProject = sumBy((m) => (m.project ? `${m.project.code} · ${m.project.name}` : null), cost);
  const byEmployee = sumBy((m) => (m.employee && Number(m.project_delta) !== 0 ? `${m.employee.first_name} ${m.employee.last_name}` : null), cost);
  const topMat = sumBy((m) => (Number(m.project_delta) !== 0 ? `${m.material?.name}` : null), cost);
  const bySupplier = sumBy((m) => (m.movement_type === "purchase_in" ? (m.document?.supplier?.name ?? "Sin proveedor") : null), (m) => Number(m.total_cost) * (m.is_reversal ? -1 : 1));
  const moved = new Set((moves ?? []).map((m) => m.material_id));
  const still = (stock ?? []).filter((m) => !moved.has(m.id!) && Number(m.quantity) > 0).sort((a, b) => Number(b.stock_value) - Number(a.stock_value));
  const sorted = (m: Map<string, number>, n = 10) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }));
  const purchases = [...bySupplier.values()].reduce((s, v) => s + v, 0);
  const consumption = [...byProject.values()].reduce((s, v) => s + v, 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Informe de almacén" description={`Periodo: ${formatDate(desde)} – ${formatDate(hasta)}. La valoración del inventario es la actual.`} />
      <ReportTabs active="/informes/almacen" />
      <PeriodBar path="/informes/almacen" desde={desde} hasta={hasta} exportHref={`/api/export/consumo?desde=${desde}&hasta=${hasta}`} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Valor del inventario" value={formatCurrencyRounded(value)} detail={`${stock?.length ?? 0} materiales`} />
        <StatCard label="Compras del periodo" value={formatCurrencyRounded(purchases)} />
        <StatCard label="Material imputado a obras" value={formatCurrencyRounded(consumption)} detail="Salidas − devoluciones aptas" />
        <StatCard label="Stock bajo" value={String((stock ?? []).filter((m) => m.is_low).length)} detail={<Link className="text-brand-600" href="/almacen/reposicion">Reposición</Link>} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader title="Valoración por categoría" description="Inventario actual a precio medio" /><CardBody><BarList items={sorted(byCat, 12)} /></CardBody></Card>
        <Card><CardHeader title="Consumo por obra" /><CardBody><BarList items={sorted(byProject)} /></CardBody></Card>
        <Card><CardHeader title="Materiales más utilizados" description="Por coste imputado" /><CardBody><BarList items={sorted(topMat)} /></CardBody></Card>
        <Card><CardHeader title="Consumo por trabajador" /><CardBody><BarList items={sorted(byEmployee)} /></CardBody></Card>
        <Card><CardHeader title="Entradas por proveedor" /><CardBody><BarList items={sorted(bySupplier)} /></CardBody></Card>
        <Card className="overflow-hidden">
          <CardHeader title="Materiales sin movimiento en el periodo" description="Con stock: posible material inmovilizado" />
          <Table className="mt-3" minWidth={400}>
            <THead><Th>Material</Th><Th align="right">Stock</Th><Th align="right">Valor</Th></THead>
            <TBody>
              {still.slice(0, 12).map((m) => <Tr key={m.id!}><Td>{m.name}<p className="text-[12px] text-muted">{m.code}</p></Td><Td align="right">{formatNumber(Number(m.quantity))} {m.unit_code}</Td><Td align="right">{formatCurrency(Number(m.stock_value))}</Td></Tr>)}
              {!still.length && <EmptyRow cols={3}>Todos los materiales han tenido movimiento.</EmptyRow>}
            </TBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
