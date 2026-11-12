import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { FilterBar, FilterSelect } from "@/components/ui/FilterBar";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { Pagination, pageRange } from "@/components/ui/Pagination";
import { ImportCsvDialog } from "@/features/finance/components/forms";
import { InvoiceTabs } from "@/features/finance/components/InvoiceTabs";
import { INVOICE_STATUS } from "@/lib/labels";
import { formatCurrency, formatCurrencyRounded, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Facturas" };

export default async function Page(props: PageProps<"/facturas">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const { from, to } = pageRange(page);
  let q = supabase.from("v_invoices").select("id, number, direction, issue_date, due_date, party_name, project_code, base_amount, total_amount, paid_amount, outstanding_amount, status, days_overdue", { count: "exact" }).order("issue_date", { ascending: false });
  if (sp.tipo) q = q.eq("direction", sp.tipo as never);
  if (sp.estado === "abiertas") q = q.in("status", ["pending", "partial", "overdue"]);
  else if (sp.estado) q = q.eq("status", sp.estado);
  if (sp.desde) q = q.gte("issue_date", sp.desde);
  if (sp.hasta) q = q.lte("issue_date", sp.hasta);
  if (sp.q) {
    const t = sp.q.replace(/[%,()*:]/g, "");
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    q = q.or([`number.ilike.%${t}%`, `party_name.ilike.%${t}%`, `concept.ilike.%${t}%`, ...(Number.isFinite(n) && t ? [`total_amount.eq.${n}`, `base_amount.eq.${n}`] : [])].join(","));
  }
  const [{ data, count }, { data: open }] = await Promise.all([q.range(from, to), supabase.from("v_invoices").select("direction, outstanding_amount, status").in("status", ["pending", "partial", "overdue"])]);
  const recv = (open ?? []).filter((i) => i.direction === "issued");
  const pay = (open ?? []).filter((i) => i.direction === "received");
  const sum = (a: typeof recv) => a.reduce((s, i) => s + Number(i.outstanding_amount), 0);
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([, v]) => !!v) as [string, string][]).toString();
  return (
    <div className="space-y-6">
      <PageHeader title="Facturas y documentación" description="Registro y seguimiento de las facturas emitidas en Contasimple y de las recibidas de proveedores." actions={<><ImportCsvDialog /><ButtonLink href="/facturas/nueva" icon={<Plus className="h-4 w-4" />}>Registrar factura</ButtonLink></>} />
      <InvoiceTabs active="/facturas" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Pendiente de cobro" value={formatCurrencyRounded(sum(recv))} detail={`${recv.length} facturas`} />
        <StatCard label="Cobros vencidos" value={String(recv.filter((i) => i.status === "overdue").length)} emphasis={recv.some((i) => i.status === "overdue") ? "danger" : undefined} detail={<Link className="text-brand-600" href="/facturas?tipo=issued&estado=overdue">Ver vencidas</Link>} />
        <StatCard label="Pendiente de pago" value={formatCurrencyRounded(sum(pay))} detail={`${pay.length} facturas`} />
        <StatCard label="Pagos vencidos" value={String(pay.filter((i) => i.status === "overdue").length)} emphasis={pay.some((i) => i.status === "overdue") ? "warning" : undefined} />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pr-5 sm:pr-6">
          <FilterBar action="/facturas" q={sp.q} placeholder="Número, cliente, proveedor o importe">
            <FilterSelect name="tipo" label="Tipo" value={sp.tipo} options={[{ value: "issued", label: "Emitidas" }, { value: "received", label: "Recibidas" }]} />
            <FilterSelect name="estado" label="Estado" value={sp.estado} options={[{ value: "abiertas", label: "Pendientes" }, ...Object.entries(INVOICE_STATUS).map(([value, l]) => ({ value, label: l.label }))]} />
            <input type="date" name="desde" defaultValue={sp.desde} aria-label="Desde" className="h-10 rounded-[var(--radius-md)] bg-surface px-3 text-[14px]" />
            <input type="date" name="hasta" defaultValue={sp.hasta} aria-label="Hasta" className="h-10 rounded-[var(--radius-md)] bg-surface px-3 text-[14px]" />
          </FilterBar>
          <div className="pb-3 pl-5 sm:pb-0 sm:pl-0"><ButtonLink href={`/api/export/facturas?${exportQs}`} variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} prefetch={false}>Excel</ButtonLink></div>
        </div>
        <Table minWidth={960}>
          <THead><Th>Factura</Th><Th>Cliente / proveedor</Th><Th>Emisión</Th><Th>Vencimiento</Th><Th align="right">Total</Th><Th align="right">Pendiente</Th><Th>Estado</Th></THead>
          <TBody>
            {(data ?? []).map((i) => (
              <Tr key={i.id!}>
                <Td><Link href={`/facturas/${i.id}`} className="font-medium text-ink hover:text-brand-600">{i.number}</Link><p className="text-[12px] text-muted">{i.direction === "issued" ? "Emitida" : "Recibida"}{i.project_code ? ` · ${i.project_code}` : ""}</p></Td>
                <Td className="text-ink-2">{i.party_name}</Td>
                <Td className="text-ink-2">{formatDate(i.issue_date!)}</Td>
                <Td className="text-ink-2">{i.due_date ? formatDate(i.due_date) : "—"}{i.status === "overdue" && <p className="text-[12px] text-danger">{i.days_overdue} días de retraso</p>}</Td>
                <Td align="right">{formatCurrency(Number(i.total_amount))}</Td>
                <Td align="right" className="font-medium">{formatCurrency(Number(i.outstanding_amount))}</Td>
                <Td><Badge tone={INVOICE_STATUS[i.status!]!.tone}>{INVOICE_STATUS[i.status!]!.label}</Badge></Td>
              </Tr>
            ))}
            {!data?.length && <EmptyRow cols={7}>No hay facturas con esos filtros.</EmptyRow>}
          </TBody>
        </Table>
        <Pagination page={page} total={count ?? 0} params={sp} basePath="/facturas" />
      </Card>
    </div>
  );
}
