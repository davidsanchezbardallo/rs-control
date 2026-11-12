import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Table, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { DocumentsCard } from "@/features/documents/components/DocumentsCard";
import { EditInvoiceDialog, PaymentDialog, VoidInvoiceDialog } from "@/features/finance/components/forms";
import { accountOptions, clientOptions, projectOptions, supplierOptions, todayISO } from "@/features/lookups";
import { INVOICE_DESTINATION, INVOICE_STATUS, VAT_REGIME } from "@/lib/labels";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Factura" };

export default async function Page(props: PageProps<"/facturas/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireAdmin();
  const { data: i } = await supabase.from("v_invoices").select("*").eq("id", id).maybeSingle();
  if (!i) notFound();
  const [{ data: pays }, accounts, clients, suppliers, projects] = await Promise.all([
    supabase.from("invoice_payments").select("id, amount, created_at, tx:financial_transactions(tx_date, description, account:bank_accounts(name))").eq("invoice_id", id).order("created_at"),
    accountOptions(supabase), clientOptions(supabase), supplierOptions(supabase), projectOptions(supabase),
  ]);
  const st = INVOICE_STATUS[i.status!]!;
  const issued = i.direction === "issued";
  // Campos de la factura editables (sin los calculados por la vista)
  const raw = Object.fromEntries(Object.entries(i).filter(([k]) => !["party_name", "project_code", "project_name", "paid_amount", "outstanding_amount", "status", "days_overdue"].includes(k)));
  return (
    <div className="space-y-6">
      <BackLink href="/facturas">Facturas</BackLink>
      <PageHeader
        eyebrow={<span className="flex gap-2"><Badge tone={issued ? "brand" : "neutral"}>{issued ? "Emitida" : "Recibida"}</Badge><Badge tone={st.tone}>{st.label}</Badge></span>}
        title={`Factura ${i.number}`}
        description={`${i.party_name} · ${formatDate(i.issue_date!)}`}
        actions={
          i.status !== "void" ? (
            <>
              {(pays?.length ?? 0) === 0 && <VoidInvoiceDialog id={id} />}
              <EditInvoiceDialog inv={raw as never} clients={clients} suppliers={suppliers} projects={projects} />
              {Number(i.outstanding_amount) > 0.005 && <PaymentDialog invoiceId={id} issued={issued} outstanding={Number(i.outstanding_amount)} accounts={accounts} today={todayISO()} />}
            </>
          ) : undefined
        }
      />
      {i.voided_at && <p className="rounded-[var(--radius-md)] bg-danger-soft px-4 py-3 text-[14px] text-danger">Anulada el {formatDateTime(i.voided_at)}: {i.void_reason}</p>}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Datos" />
          <CardBody>
            <DescriptionList
              columns={3}
              items={[
                { label: issued ? "Cliente" : "Proveedor", value: i.party_name },
                { label: "Obra", value: i.project_id ? <Link className="text-brand-600" href={`/obras/${i.project_id}?tab=economico`}>{i.project_code} · {i.project_name}</Link> : null },
                { label: "Vencimiento", value: i.due_date ? `${formatDate(i.due_date)}${i.status === "overdue" ? ` · ${i.days_overdue} días de retraso` : ""}` : null },
                { label: "Régimen de IVA", value: VAT_REGIME[i.vat_regime!] },
                { label: "Destino", value: i.destination ? INVOICE_DESTINATION[i.destination] : null },
                { label: "Referencia externa", value: i.external_ref },
                { label: "Concepto", value: i.concept },
              ]}
            />
            {i.notes && <p className="mt-5 rounded-[var(--radius-md)] bg-surface px-4 py-3 text-[14px] text-ink-2">{i.notes}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Importes" />
          <CardBody>
            <dl className="space-y-2 text-[14px]">
              {[
                ["Base imponible", Number(i.base_amount)],
                ["IVA", Number(i.vat_amount)],
                ["Retención IRPF", -Number(i.irpf_amount)],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between"><dt className="text-muted">{l}</dt><dd className="tabular">{formatCurrency(v as number)}</dd></div>
              ))}
              <div className="flex justify-between border-t border-line pt-2 text-[16px] font-semibold"><dt>Total</dt><dd className="tabular">{formatCurrency(Number(i.total_amount))}</dd></div>
              <div className="flex justify-between text-success"><dt>{issued ? "Cobrado" : "Pagado"}</dt><dd className="tabular">{formatCurrency(Number(i.paid_amount))}</dd></div>
              <div className="flex justify-between font-medium"><dt>Pendiente</dt><dd className="tabular">{formatCurrency(Number(i.outstanding_amount))}</dd></div>
              {Number(i.guarantee_amount) > 0 && (
                <div className="mt-3 rounded-[var(--radius-md)] bg-surface px-3 py-2 text-[13px] text-ink-2">Retención de garantía: {formatCurrency(Number(i.guarantee_amount))}{i.guarantee_release_date ? ` · liberación prevista ${formatDate(i.guarantee_release_date)}` : ""}</div>
              )}
            </dl>
          </CardBody>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <CardHeader title={issued ? "Cobros" : "Pagos"} description="Cada cobro o pago crea su movimiento bancario." />
        <Table className="mt-3">
          <THead><Th>Fecha</Th><Th>Cuenta</Th><Th>Concepto</Th><Th align="right">Importe</Th></THead>
          <TBody>
            {(pays ?? []).map((p) => (
              <Tr key={p.id}><Td>{p.tx ? formatDate(p.tx.tx_date) : "—"}</Td><Td className="text-ink-2">{p.tx?.account?.name}</Td><Td className="text-ink-2">{p.tx?.description}</Td><Td align="right" className="font-medium">{formatCurrency(Number(p.amount))}</Td></Tr>
            ))}
            {!pays?.length && <EmptyRow cols={4}>Sin {issued ? "cobros" : "pagos"} registrados.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
      <DocumentsCard supabase={supabase} entity="invoice" entityId={id} title="PDF de la factura" defaultCategory="invoice" categories={["invoice", "delivery_note", "other"]} />
    </div>
  );
}
