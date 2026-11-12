import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { BarList, PeriodBar, ReportTabs, period } from "@/features/reports/components";
import { NotAccounting } from "@/features/finance/components/TreasuryTabs";
import { LOAN_KIND } from "@/lib/labels";
import { formatCurrency, formatCurrencyRounded, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Informe financiero" };
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

export default async function Page(props: PageProps<"/informes/finanzas">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { desde, hasta } = period(sp);
  const { supabase } = await requireAdmin();
  const [{ data: tx }, { data: inv }, { data: loans }, { data: rec }, { data: bal }] = await Promise.all([
    supabase.from("financial_transactions").select("tx_date, amount, category, kind").eq("status", "confirmed").neq("kind", "transfer").gte("tx_date", desde).lte("tx_date", hasta),
    supabase.from("v_invoices").select("direction, outstanding_amount, status").in("status", ["pending", "partial", "overdue"]),
    supabase.from("loans").select("lender, kind, outstanding, installment_amount").eq("is_active", true),
    supabase.from("recurring_commitments").select("amount, frequency").eq("is_active", true),
    supabase.from("v_bank_balances").select("balance").eq("is_active", true),
  ]);
  const monthly = new Map<string, { month: string; income: number; expense: number }>();
  const byCat = new Map<string, number>();
  let income = 0, expense = 0;
  for (const t of tx ?? []) {
    const k = t.tx_date.slice(0, 7);
    const m = monthly.get(k) ?? { month: `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`, income: 0, expense: 0 };
    const a = Number(t.amount);
    if (a > 0) { m.income += a; income += a; } else { m.expense -= a; expense -= a; byCat.set(t.category ?? "Sin categoría", (byCat.get(t.category ?? "Sin categoría") ?? 0) - a); }
    monthly.set(k, m);
  }
  const series = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => ({ ...v, income: Math.round(v.income), expense: Math.round(v.expense) }));
  const sum = (d: string) => (inv ?? []).filter((i) => i.direction === d).reduce((s, i) => s + Number(i.outstanding_amount), 0);
  const debt = (loans ?? []).reduce((s, l) => s + Number(l.outstanding), 0);
  const commitments = (rec ?? []).reduce((s, r) => s + Number(r.amount) * (r.frequency === "monthly" ? 12 : r.frequency === "quarterly" ? 4 : 1), 0);
  const liquidity = (bal ?? []).reduce((s, b) => s + Number(b.balance), 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Informe financiero" description={`Periodo: ${formatDate(desde)} – ${formatDate(hasta)} (movimientos bancarios confirmados, sin transferencias internas).`} />
      <ReportTabs active="/informes/finanzas" />
      <PeriodBar path="/informes/finanzas" desde={desde} hasta={hasta} exportHref={`/api/export/tesoreria?desde=${desde}&hasta=${hasta}`} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Ingresos" value={formatCurrencyRounded(income)} />
        <StatCard label="Gastos" value={formatCurrencyRounded(expense)} />
        <StatCard label="Resultado de caja" value={formatCurrencyRounded(income - expense)} emphasis={income - expense < 0 ? "danger" : undefined} />
        <StatCard label="Liquidez actual" value={formatCurrencyRounded(liquidity)} />
      </div>
      <Card><CardHeader title="Evolución de ingresos y gastos" /><CardBody><IncomeExpenseChart data={series} /></CardBody></Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader title="Gastos por categoría" /><CardBody><BarList items={[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} /></CardBody></Card>
        <Card className="overflow-hidden">
          <CardHeader title="Posición financiera" description="A fecha de hoy" />
          <Table className="mt-3" minWidth={360}>
            <TBody>
              <Tr><Td>Cobros pendientes</Td><Td align="right" className="text-success">{formatCurrency(sum("issued"))}</Td></Tr>
              <Tr><Td>Pagos pendientes</Td><Td align="right">{formatCurrency(-sum("received"))}</Td></Tr>
              <Tr><Td>Deuda financiera</Td><Td align="right">{formatCurrency(-debt)}</Td></Tr>
              <Tr><Td>Compromisos recurrentes (12 meses)</Td><Td align="right">{formatCurrency(-commitments)}</Td></Tr>
            </TBody>
          </Table>
          <Table className="border-t border-line" minWidth={360}>
            <THead><Th>Financiación</Th><Th align="right">Pendiente</Th><Th align="right">Cuota</Th></THead>
            <TBody>{(loans ?? []).map((l, i) => <Tr key={i}><Td>{l.lender}<p className="text-[12px] text-muted">{LOAN_KIND[l.kind]}</p></Td><Td align="right">{formatCurrency(Number(l.outstanding))}</Td><Td align="right">{l.installment_amount ? formatCurrency(Number(l.installment_amount)) : "—"}</Td></Tr>)}</TBody>
          </Table>
        </Card>
      </div>
      <NotAccounting />
    </div>
  );
}
