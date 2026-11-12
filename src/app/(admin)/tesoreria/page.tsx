import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { AccountDialog } from "@/features/finance/components/forms";
import { NotAccounting, TreasuryTabs } from "@/features/finance/components/TreasuryTabs";
import { buildForecast, type ForecastItem } from "@/features/finance/forecast";
import { todayISO } from "@/features/lookups";
import { formatCurrency, formatCurrencyRounded, formatDate, formatDateTime, maskIban } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Tesorería" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const [{ data: accounts }, { data: fc }, { data: inv }, { data: loans }] = await Promise.all([
    supabase.from("v_bank_balances").select("*").order("name"),
    supabase.rpc("cash_forecast", { p_days: 90 }),
    supabase.from("v_invoices").select("direction, outstanding_amount, status").in("status", ["pending", "partial", "overdue"]),
    supabase.from("loans").select("outstanding, kind").eq("is_active", true),
  ]);
  const total = (accounts ?? []).filter((a) => a.is_active).reduce((s, a) => s + Number(a.balance), 0);
  const today = todayISO();
  const items = (fc ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as ForecastItem[];
  const f30 = buildForecast(total, items, today, 30, 0);
  const f90 = buildForecast(total, items, today, 90, 0);
  const recv = (inv ?? []).filter((i) => i.direction === "issued").reduce((s, i) => s + Number(i.outstanding_amount), 0);
  const pay = (inv ?? []).filter((i) => i.direction === "received").reduce((s, i) => s + Number(i.outstanding_amount), 0);
  const debt = (loans ?? []).reduce((s, l) => s + Number(l.outstanding), 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Tesorería y finanzas" description="Liquidez, cobros, pagos y previsión de caja." actions={<AccountDialog />} />
      <TreasuryTabs active="/tesoreria" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Saldo actual" value={formatCurrencyRounded(total)} icon={Landmark} />
        <StatCard label="Previsto a 30 días" value={formatCurrencyRounded(f30.final)} icon={Scale} emphasis={f30.final < 0 ? "danger" : undefined} detail={<Link className="text-brand-600" href="/tesoreria/prevision">Ver previsión</Link>} />
        <StatCard label="Pendiente de cobro" value={formatCurrencyRounded(recv)} icon={TrendingUp} />
        <StatCard label="Pendiente de pago" value={formatCurrencyRounded(pay)} icon={TrendingDown} detail={`Deuda financiera ${formatCurrencyRounded(debt)}`} />
      </div>
      {f90.min.balance < 0 && (
        <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-4 py-3 text-[14px] text-danger">
          Atención: la previsión indica saldo negativo ({formatCurrencyRounded(f90.min.balance)}) el {formatDate(f90.min.date)}. Revisa la <Link className="font-medium underline" href="/tesoreria/prevision?dias=90">previsión</Link>.
        </p>
      )}
      <Card className="overflow-hidden">
        <CardHeader title="Cuentas bancarias" description="Saldo = saldo inicial + movimientos confirmados" />
        <Table className="mt-3">
          <THead><Th>Cuenta</Th><Th>IBAN</Th><Th>Saldo inicial</Th><Th align="right">Saldo actual</Th><Th align="right"> </Th></THead>
          <TBody>
            {(accounts ?? []).map((a) => (
              <Tr key={a.id!}>
                <Td><Link href={`/tesoreria/movimientos?cuenta=${a.id}`} className="font-medium text-ink hover:text-brand-600">{a.name}</Link><p className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">{a.bank_name}{!a.is_active && " · inactiva"}{a.sync_mode === "bank" ? <Badge tone="success">Automática{a.bank_balance_at ? ` · ${formatDateTime(a.bank_balance_at)}` : ""}</Badge> : <Badge>Manual</Badge>}</p></Td>
                <Td className="font-mono text-[13px] text-ink-2">{a.iban ? maskIban(a.iban) : "—"}</Td>
                <Td className="text-ink-2">{formatCurrency(Number(a.opening_balance))} <span className="text-muted">({formatDate(a.opening_date!)})</span></Td>
                <Td align="right" className="text-[15px] font-semibold">{formatCurrency(Number(a.balance))}</Td>
                <Td align="right"><AccountDialog a={{ ...a, sync_mode: undefined, bank_balance_at: undefined }} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Próximos 30 días" description={`Entradas ${formatCurrencyRounded(f30.inflow)} · Salidas ${formatCurrencyRounded(f30.outflow)}`} />
        <Table className="mt-3">
          <THead><Th>Fecha</Th><Th>Concepto</Th><Th>Tipo</Th><Th align="right">Importe</Th><Th align="right">Saldo previsto</Th></THead>
          <TBody>
            {f30.rows.slice(0, 12).map((r, i) => (
              <Tr key={i}>
                <Td className="whitespace-nowrap">{formatDate(r.due_date)}</Td>
                <Td>{r.concept}</Td>
                <Td>{r.is_estimate ? <Badge tone="warning">Estimado</Badge> : <Badge>Confirmado</Badge>}</Td>
                <Td align="right" className={r.amount > 0 ? "text-success" : ""}>{formatCurrency(r.amount)}</Td>
                <Td align="right" className={r.balance < 0 ? "font-medium text-danger" : "font-medium"}>{formatCurrency(r.balance)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
      <NotAccounting />
    </div>
  );
}
