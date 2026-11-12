import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { ForecastChart } from "@/features/finance/components/ForecastChart";
import { NotAccounting, TreasuryTabs } from "@/features/finance/components/TreasuryTabs";
import { buildForecast, type ForecastItem } from "@/features/finance/forecast";
import { todayISO } from "@/features/lookups";
import { COMMITMENT_KIND } from "@/lib/labels";
import { formatCurrency, formatCurrencyRounded, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Previsión de tesorería" };
const SOURCE: Record<string, string> = { collection: "Cobro de factura", payment: "Pago de factura", guarantee: "Retención de garantía", loan: "Cuota de financiación", ...COMMITMENT_KIND };

export default async function Page(props: PageProps<"/tesoreria/prevision">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const days = [30, 60, 90].includes(Number(sp.dias)) ? Number(sp.dias) : 30;
  const threshold = Number(sp.minimo ?? 5000);
  const { supabase } = await requireAdmin();
  const [{ data: accounts }, { data: fc }] = await Promise.all([supabase.from("v_bank_balances").select("balance").eq("is_active", true), supabase.rpc("cash_forecast", { p_days: days })]);
  const current = (accounts ?? []).reduce((s, a) => s + Number(a.balance), 0);
  const f = buildForecast(current, (fc ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as ForecastItem[], todayISO(), days, threshold);
  return (
    <div className="space-y-6">
      <PageHeader title="Tesorería y finanzas" description="Previsión del saldo con cobros y pagos pendientes, cuotas y compromisos recurrentes." />
      <TreasuryTabs active="/tesoreria/prevision" />
      <div className="flex flex-wrap items-center gap-2">
        {[30, 60, 90].map((d) => (
          <Link key={d} href={`?dias=${d}&minimo=${threshold}`} className={cn("h-9 rounded-full px-4 text-[14px] leading-9 ring-1 ring-inset", d === days ? "bg-brand-600 text-white ring-brand-600" : "text-ink-2 ring-line hover:bg-surface")}>{d} días</Link>
        ))}
        <form className="ml-auto flex items-center gap-2 text-[13px] text-muted">
          <input type="hidden" name="dias" value={days} />
          <label htmlFor="minimo">Saldo mínimo de seguridad (€)</label>
          <input id="minimo" name="minimo" defaultValue={threshold} inputMode="numeric" className="tabular h-9 w-28 rounded-[var(--radius-md)] bg-surface px-3 text-right text-ink" />
        </form>
      </div>
      {f.firstBelow && (
        <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] bg-danger-soft px-4 py-3 text-[14px] text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          El {formatDate(f.firstBelow.due_date)} el saldo previsto bajará a {formatCurrencyRounded(f.firstBelow.balance)}, por debajo del mínimo de {formatCurrencyRounded(threshold)} («{f.firstBelow.concept}»).
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Saldo actual" value={formatCurrencyRounded(current)} />
        <StatCard label="Entradas previstas" value={formatCurrencyRounded(f.inflow)} />
        <StatCard label="Salidas previstas" value={formatCurrencyRounded(f.outflow)} />
        <StatCard label={`Saldo a ${days} días`} value={formatCurrencyRounded(f.final)} emphasis={f.final < threshold ? "danger" : undefined} detail={`Mínimo ${formatCurrencyRounded(f.min.balance)} el ${formatDate(f.min.date)}`} />
      </div>
      <Card>
        <CardHeader title="Evolución del saldo previsto" description="Las estimaciones (nóminas, impuestos…) se marcan como tales en la tabla." />
        <CardBody><ForecastChart data={f.series} threshold={threshold} /></CardBody>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Detalle" />
        <Table className="mt-3" minWidth={760}>
          <THead><Th>Fecha</Th><Th>Concepto</Th><Th>Origen</Th><Th>Tipo</Th><Th align="right">Importe</Th><Th align="right">Saldo</Th></THead>
          <TBody>
            {f.rows.map((r, i) => (
              <Tr key={i}>
                <Td className="whitespace-nowrap">{formatDate(r.due_date)}</Td>
                <Td>{r.concept}</Td>
                <Td className="text-ink-2">{SOURCE[r.source] ?? r.source}</Td>
                <Td>{r.is_estimate ? <Badge tone="warning">Estimado</Badge> : <Badge>Confirmado</Badge>}</Td>
                <Td align="right" className={r.amount > 0 ? "text-success" : ""}>{formatCurrency(r.amount)}</Td>
                <Td align="right" className={cn("font-medium", r.balance < threshold && "text-danger")}>{formatCurrency(r.balance)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
      <NotAccounting />
    </div>
  );
}
