import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterSelect } from "@/components/ui/FilterBar";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { Pagination, pageRange } from "@/components/ui/Pagination";
import { TransactionDialog, TransferDialog, VoidTransactionDialog } from "@/features/finance/components/forms";
import { NotAccounting, TreasuryTabs } from "@/features/finance/components/TreasuryTabs";
import { accountOptions, clientOptions, projectOptions, supplierOptions, todayISO } from "@/features/lookups";
import { TX_KIND, options } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Movimientos bancarios" };

export default async function Page(props: PageProps<"/tesoreria/movimientos">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const { from, to } = pageRange(page);
  let q = supabase.from("financial_transactions").select("id, tx_date, amount, kind, category, description, status, void_reason, source, counterparty_name, account:bank_accounts(name), project:projects(code)", { count: "exact" }).order("tx_date", { ascending: false }).order("created_at", { ascending: false });
  if (sp.cuenta) q = q.eq("account_id", sp.cuenta);
  if (sp.tipo) q = q.eq("kind", sp.tipo as never);
  if (sp.desde) q = q.gte("tx_date", sp.desde);
  if (sp.hasta) q = q.lte("tx_date", sp.hasta);
  if (sp.q) q = q.or(`description.ilike.%${sp.q.replace(/[%,()*.:]/g, "")}%,category.ilike.%${sp.q.replace(/[%,()*.:]/g, "")}%`);
  const [{ data, count }, accounts, projects, clients, suppliers] = await Promise.all([q.range(from, to), accountOptions(supabase), projectOptions(supabase), clientOptions(supabase), supplierOptions(supabase)]);
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([, v]) => !!v) as [string, string][]).toString();
  return (
    <div className="space-y-6">
      <PageHeader title="Tesorería y finanzas" description="Movimientos bancarios registrados manualmente." actions={<><TransferDialog accounts={accounts} today={todayISO()} /><TransactionDialog accounts={accounts} projects={projects} clients={clients} suppliers={suppliers} today={todayISO()} /></>} />
      <TreasuryTabs active="/tesoreria/movimientos" />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pr-5 sm:pr-6">
          <FilterBar action="/tesoreria/movimientos" q={sp.q} placeholder="Concepto o categoría">
            <FilterSelect name="cuenta" label="Cuenta" value={sp.cuenta} options={accounts} />
            <FilterSelect name="tipo" label="Tipo" value={sp.tipo} options={options(TX_KIND)} />
            <input type="date" name="desde" defaultValue={sp.desde} aria-label="Desde" className="h-10 rounded-[var(--radius-md)] bg-surface px-3 text-[14px]" />
            <input type="date" name="hasta" defaultValue={sp.hasta} aria-label="Hasta" className="h-10 rounded-[var(--radius-md)] bg-surface px-3 text-[14px]" />
          </FilterBar>
          <div className="pb-3 pl-5 sm:pb-0 sm:pl-0"><ButtonLink href={`/api/export/tesoreria?${exportQs}`} variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} prefetch={false}>Excel</ButtonLink></div>
        </div>
        <Table minWidth={860}>
          <THead><Th>Fecha</Th><Th>Concepto</Th><Th>Cuenta</Th><Th>Tipo</Th><Th align="right">Importe</Th><Th align="right"> </Th></THead>
          <TBody>
            {(data ?? []).map((t) => (
              <Tr key={t.id} className={cn(t.status === "void" && "opacity-50")}>
                <Td className="whitespace-nowrap text-ink-2">{formatDate(t.tx_date)}</Td>
                <Td><span className={cn(t.status === "void" && "line-through")}>{t.description}</span><p className="text-[12px] text-muted">{[t.counterparty_name, t.category, t.project?.code, t.status === "void" ? `Anulado: ${t.void_reason}` : null].filter(Boolean).join(" · ")}</p></Td>
                <Td className="text-ink-2">{t.account?.name}</Td>
                <Td><span className="flex flex-wrap gap-1"><Badge>{TX_KIND[t.kind]}</Badge>{t.source === "bank" && <Badge tone="brand">Banco</Badge>}</span></Td>
                <Td align="right" className={cn("font-medium", Number(t.amount) > 0 ? "text-success" : "text-ink")}>{formatCurrency(Number(t.amount))}</Td>
                <Td align="right">{t.status === "confirmed" && t.source === "manual" && <VoidTransactionDialog id={t.id} />}</Td>
              </Tr>
            ))}
            {!data?.length && <EmptyRow cols={6}>No hay movimientos con esos filtros.</EmptyRow>}
          </TBody>
        </Table>
        <Pagination page={page} total={count ?? 0} params={sp} basePath="/tesoreria/movimientos" />
      </Card>
      <NotAccounting />
    </div>
  );
}
