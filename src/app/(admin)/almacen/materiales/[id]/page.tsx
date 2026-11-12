import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { EditMaterialDialog } from "@/features/inventory/components/dialogs";
import { categoryOptions, supplierOptions, unitOptions } from "@/features/lookups";
import { MOVEMENT_TYPE } from "@/lib/labels";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Material" };

export default async function Page(props: PageProps<"/almacen/materiales/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireAdmin();
  const [{ data: m }, { data: raw }, { data: moves }, categories, units, suppliers] = await Promise.all([
    supabase.from("v_stock").select("*").eq("id", id).maybeSingle(),
    supabase.from("materials").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("stock_movements")
      .select("id, movement_type, is_reversal, quantity, warehouse_delta, unit_cost, total_cost, occurred_at, document:inventory_documents(id, number), project:projects(id, code, name), employee:employees(first_name, last_name)")
      .eq("material_id", id)
      .order("id", { ascending: false })
      .limit(100),
    categoryOptions(supabase),
    unitOptions(supabase),
    supplierOptions(supabase),
  ]);
  if (!m || !raw) notFound();

  return (
    <div className="space-y-6">
      <BackLink href="/almacen">Almacén</BackLink>
      <PageHeader
        eyebrow={<span className="font-mono">{m.code}</span>}
        title={m.name!}
        description={[m.brand, m.model_ref, m.category_name].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <ButtonLink href={`/almacen/ajuste?material=${m.id}`} variant="ghost" icon={<SlidersHorizontal className="h-4 w-4" />}>Ajuste</ButtonLink>
            <EditMaterialDialog
              m={{ ...raw, min_stock: String(raw.min_stock).replace(".", ",") }}
              categories={categories}
              units={units}
              suppliers={suppliers}
            />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Stock disponible"
          value={`${formatNumber(Number(m.quantity))} ${m.unit_code}`}
          emphasis={Number(m.quantity) <= 0 ? "danger" : m.is_low ? "warning" : undefined}
          detail={m.is_low ? <Badge tone="warning">Por debajo del mínimo</Badge> : `Mínimo ${formatNumber(Number(m.min_stock))} ${m.unit_code}`}
        />
        <StatCard label="Coste medio (PMP)" value={formatCurrency(Number(m.avg_unit_cost))} />
        <StatCard label="Valor en stock" value={formatCurrency(Number(m.stock_value))} />
        <StatCard label="Ubicación" value={m.location ?? "—"} detail={m.supplier_name ? `Proveedor: ${m.supplier_name}` : undefined} />
      </div>

      {raw.description && (
        <Card className="p-5 sm:p-6">
          <DescriptionList columns={1} items={[{ label: "Descripción", value: raw.description }]} />
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader title="Historial de movimientos" description="Trazable e inmutable. Los errores se corrigen con anulaciones o ajustes." />
        <Table minWidth={860} className="mt-4">
          <THead>
            <Th>Fecha</Th>
            <Th>Tipo</Th>
            <Th>Documento</Th>
            <Th>Obra / trabajador</Th>
            <Th align="right">Cantidad</Th>
            <Th align="right">Coste unit.</Th>
            <Th align="right">Importe</Th>
          </THead>
          <TBody>
            {(moves ?? []).map((mv) => {
              const t = MOVEMENT_TYPE[mv.movement_type];
              const d = Number(mv.warehouse_delta);
              return (
                <Tr key={mv.id}>
                  <Td className="whitespace-nowrap text-ink-2">{formatDateTime(mv.occurred_at)}</Td>
                  <Td>
                    <Badge tone={mv.is_reversal ? "danger" : t.tone}>{mv.is_reversal ? `Anulación · ${t.label}` : t.label}</Badge>
                  </Td>
                  <Td>
                    {mv.document && <Link className="font-medium text-brand-600" href={`/almacen/movimientos/${mv.document.id}`}>{mv.document.number}</Link>}
                  </Td>
                  <Td className="text-ink-2">
                    {mv.project ? `${mv.project.code} · ${mv.project.name}` : "—"}
                    {mv.employee && <p className="text-[12px] text-muted">{mv.employee.first_name} {mv.employee.last_name}</p>}
                  </Td>
                  <Td align="right" className={d > 0 ? "font-medium text-success" : d < 0 ? "font-medium text-ink" : "text-muted"}>
                    {d > 0 ? "+" : d < 0 ? "−" : ""}
                    {formatNumber(Number(mv.quantity))}
                  </Td>
                  <Td align="right" className="text-ink-2">{formatCurrency(Number(mv.unit_cost))}</Td>
                  <Td align="right">{formatCurrency(Number(mv.total_cost))}</Td>
                </Tr>
              );
            })}
            {!moves?.length && <EmptyRow cols={7}>Sin movimientos todavía.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
