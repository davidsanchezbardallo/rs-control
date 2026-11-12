import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Printer } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { PrintButton } from "@/components/ui/PrintButton";
import { ReverseDocumentDialog } from "@/features/inventory/components/dialogs";
import { ADJUST_REASON, INVENTORY_KIND, MOVEMENT_TYPE } from "@/lib/labels";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Documento de almacén" };

export default async function Page(props: PageProps<"/almacen/movimientos/[id]">) {
  const { id } = await props.params;
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const { data: d } = await supabase
    .from("inventory_documents")
    .select("*, project:projects(id, code, name), employee:employees(id, first_name, last_name), supplier:suppliers(name), request:material_requests(id, number)")
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();
  const [{ data: lines }, { data: related }, { data: creator }] = await Promise.all([
    supabase.from("stock_movements").select("id, movement_type, is_reversal, quantity, unit_cost, total_cost, material:materials(id, code, name, unit:units(code))").eq("document_id", id).order("id"),
    supabase.from("inventory_documents").select("id, number").in("id", [d.reverses_document_id, d.reversed_by_document_id].filter(Boolean) as string[]),
    supabase.from("profiles").select("full_name").eq("id", d.created_by).maybeSingle(),
  ]);
  const total = (lines ?? []).reduce((s, l) => s + Number(l.total_cost), 0);
  const k = INVENTORY_KIND[d.kind];
  const relatedNumber = (rid: string | null) => related?.find((r) => r.id === rid)?.number;

  return (
    <div className="space-y-6">
      <div className="print:hidden"><BackLink href="/almacen/movimientos">Movimientos</BackLink></div>
      {sp.ok && (
        <p role="status" className="flex items-center gap-2 rounded-[var(--radius-md)] bg-success-soft px-4 py-3 text-[14px] text-success print:hidden">
          <CheckCircle2 className="h-4 w-4" /> Operación registrada correctamente.
        </p>
      )}
      <PageHeader
        eyebrow={<Badge tone={k.tone}>{k.label}</Badge>}
        title={d.number}
        description={formatDateTime(d.occurred_at)}
        actions={
          <div className="flex gap-2 print:hidden">
            <PrintButton icon={<Printer className="h-4 w-4" />} />
            {d.kind !== "reversal" && !d.reversed_by_document_id && <ReverseDocumentDialog documentId={d.id} number={d.number} />}
          </div>
        }
      />
      {d.reversed_by_document_id && (
        <p className="rounded-[var(--radius-md)] bg-danger-soft px-4 py-3 text-[14px] text-danger">
          Documento anulado por <Link className="font-medium underline" href={`/almacen/movimientos/${d.reversed_by_document_id}`}>{relatedNumber(d.reversed_by_document_id)}</Link>.
        </p>
      )}
      <Card className="p-5 sm:p-6">
        <DescriptionList
          columns={3}
          items={[
            { label: "Obra", value: d.project ? <Link className="text-brand-600" href={`/obras/${d.project.id}`}>{d.project.code} · {d.project.name}</Link> : null },
            { label: "Trabajador", value: d.employee ? <Link className="text-brand-600" href={`/trabajadores/${d.employee.id}`}>{d.employee.first_name} {d.employee.last_name}</Link> : null },
            { label: "Proveedor", value: d.supplier?.name },
            { label: "Referencia / albarán", value: d.reference },
            { label: "Motivo", value: d.reason ? (ADJUST_REASON[d.reason] ?? d.reason) : null },
            { label: "Solicitud", value: d.request ? <Link className="text-brand-600" href={`/almacen/solicitudes/${d.request.id}`}>{d.request.number}</Link> : null },
            { label: "Registrado por", value: creator?.full_name },
            { label: "Recepción", value: d.kind === "issue" ? (d.received_confirmed_at ? `Confirmada ${formatDateTime(d.received_confirmed_at)}` : "Pendiente de confirmar") : null },
            { label: "Anula a", value: d.reverses_document_id ? <Link className="text-brand-600" href={`/almacen/movimientos/${d.reverses_document_id}`}>{relatedNumber(d.reverses_document_id)}</Link> : null },
          ]}
        />
        {d.notes && <p className="mt-5 rounded-[var(--radius-md)] bg-surface px-4 py-3 text-[14px] text-ink-2">{d.notes}</p>}
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Líneas" description="Coste unitario congelado en el momento del movimiento." />
        <Table className="mt-4">
          <THead>
            <Th>Material</Th>
            <Th>Movimiento</Th>
            <Th align="right">Cantidad</Th>
            <Th align="right">Coste unit.</Th>
            <Th align="right">Importe</Th>
          </THead>
          <TBody>
            {(lines ?? []).map((l) => (
              <Tr key={l.id}>
                <Td>
                  <Link href={`/almacen/materiales/${l.material?.id}`} className="font-medium text-ink hover:text-brand-600">{l.material?.name}</Link>
                  <p className="text-[12px] text-muted">{l.material?.code}</p>
                </Td>
                <Td><Badge tone={l.is_reversal ? "danger" : MOVEMENT_TYPE[l.movement_type].tone}>{MOVEMENT_TYPE[l.movement_type].label}{l.is_reversal ? " (inversa)" : ""}</Badge></Td>
                <Td align="right">{formatNumber(Number(l.quantity))} {l.material?.unit?.code}</Td>
                <Td align="right" className="text-ink-2">{formatCurrency(Number(l.unit_cost))}</Td>
                <Td align="right" className="font-medium">{formatCurrency(Number(l.total_cost))}</Td>
              </Tr>
            ))}
            <tr className="border-t border-line-strong">
              <td colSpan={4} className="px-6 py-3 text-right text-[13px] font-medium text-muted">Total</td>
              <td className="tabular px-6 py-3 text-right font-semibold">{formatCurrency(total)}</td>
            </tr>
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
