import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { CommitmentDialog, LoanDialog } from "@/features/finance/components/forms";
import { NotAccounting, TreasuryTabs } from "@/features/finance/components/TreasuryTabs";
import { accountOptions, todayISO, vehicleOptions } from "@/features/lookups";
import { COMMITMENT_KIND, FREQUENCY, LOAN_KIND } from "@/lib/labels";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Financiación y compromisos" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const [{ data: loans }, { data: rec }, accounts, vehicles] = await Promise.all([
    supabase.from("loans").select("*").order("is_active", { ascending: false }).order("start_date"),
    supabase.from("recurring_commitments").select("*, vehicle:vehicles(plate)").order("is_active", { ascending: false }).order("kind"),
    accountOptions(supabase),
    vehicleOptions(supabase),
  ]);
  const monthly = (rec ?? []).filter((r) => r.is_active).reduce((s, r) => s + Number(r.amount) / (r.frequency === "monthly" ? 1 : r.frequency === "quarterly" ? 3 : 12), 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Tesorería y finanzas" description="Préstamos, pólizas de crédito, leasing, renting y gastos recurrentes." />
      <TreasuryTabs active="/tesoreria/financiacion" />
      <Card className="overflow-hidden">
        <CardHeader title="Financiación" description="Préstamos, pólizas y leasing" action={<LoanDialog accounts={accounts} />} />
        <Table className="mt-3" minWidth={860}>
          <THead><Th>Entidad</Th><Th>Tipo</Th><Th align="right">Concedido</Th><Th align="right">Pendiente / dispuesto</Th><Th align="right">Interés</Th><Th>Cuota</Th><Th>Vencimiento</Th><Th> </Th></THead>
          <TBody>
            {(loans ?? []).map((l) => (
              <Tr key={l.id} className={l.is_active ? "" : "opacity-50"}>
                <Td className="font-medium">{l.lender}</Td>
                <Td><Badge>{LOAN_KIND[l.kind]}</Badge></Td>
                <Td align="right">{formatCurrency(Number(l.principal))}</Td>
                <Td align="right" className="font-medium">{formatCurrency(Number(l.outstanding))}</Td>
                <Td align="right" className="text-ink-2">{l.interest_rate ? `${formatNumber(Number(l.interest_rate), 3)} %` : "—"}</Td>
                <Td className="text-ink-2">{l.installment_amount ? `${formatCurrency(Number(l.installment_amount))} · día ${l.payment_day ?? "—"}` : "—"}</Td>
                <Td className="text-ink-2">{l.end_date ? formatDate(l.end_date) : "—"}</Td>
                <Td align="right"><LoanDialog l={l} accounts={accounts} /></Td>
              </Tr>
            ))}
            {!loans?.length && <EmptyRow cols={8}>Sin financiación registrada.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Gastos recurrentes y compromisos" description={`Equivalente mensual: ${formatCurrency(monthly)}`} action={<CommitmentDialog vehicles={vehicles} today={todayISO()} />} />
        <Table className="mt-3" minWidth={860}>
          <THead><Th>Concepto</Th><Th>Tipo</Th><Th align="right">Importe</Th><Th>Periodicidad</Th><Th>Vigencia</Th><Th> </Th></THead>
          <TBody>
            {(rec ?? []).map((r) => (
              <Tr key={r.id} className={r.is_active ? "" : "opacity-50"}>
                <Td><span className="font-medium">{r.name}</span><p className="text-[12px] text-muted">{[r.counterparty, r.vehicle?.plate].filter(Boolean).join(" · ")}</p></Td>
                <Td><span className="flex gap-1.5"><Badge>{COMMITMENT_KIND[r.kind]}</Badge>{r.is_estimate && <Badge tone="warning">Estimado</Badge>}</span></Td>
                <Td align="right" className="font-medium">{formatCurrency(Number(r.amount))}</Td>
                <Td className="text-ink-2">{FREQUENCY[r.frequency]} · día {r.day_of_month}</Td>
                <Td className="text-ink-2">{formatDate(r.start_date)}{r.end_date ? ` → ${formatDate(r.end_date)}` : ""}</Td>
                <Td align="right"><CommitmentDialog c={{ ...r, vehicle: undefined }} vehicles={vehicles} today={todayISO()} /></Td>
              </Tr>
            ))}
            {!rec?.length && <EmptyRow cols={6}>Sin compromisos registrados.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
      <NotAccounting />
    </div>
  );
}
