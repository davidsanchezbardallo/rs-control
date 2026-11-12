import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Download, Undo2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterSelect } from "@/components/ui/FilterBar";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { Pagination, pageRange } from "@/components/ui/Pagination";
import { InventoryTabs } from "@/features/inventory/components/InventoryTabs";
import { projectOptions } from "@/features/lookups";
import { INVENTORY_KIND, options } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Movimientos de almacén" };

export default async function Page(props: PageProps<"/almacen/movimientos">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const { from, to } = pageRange(page);
  let q = supabase
    .from("inventory_documents")
    .select("id, number, kind, occurred_at, reference, reason, received_confirmed_at, reversed_by_document_id, project:projects(code, name), employee:employees(first_name, last_name), supplier:suppliers(name)", { count: "exact" })
    .order("occurred_at", { ascending: false });
  if (sp.q) q = q.or(`number.ilike.%${sp.q.replace(/[%,()*.:]/g, "")}%,reference.ilike.%${sp.q.replace(/[%,()*.:]/g, "")}%`);
  if (sp.tipo) q = q.eq("kind", sp.tipo as never);
  if (sp.obra) q = q.eq("project_id", sp.obra);
  if (sp.desde) q = q.gte("occurred_at", sp.desde);
  if (sp.hasta) q = q.lte("occurred_at", `${sp.hasta}T23:59:59`);
  const [{ data, count }, projects, { count: pending }] = await Promise.all([
    q.range(from, to),
    projectOptions(supabase),
    supabase.from("material_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "in_review", "approved", "prepared"]),
  ]);
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([, v]) => !!v) as [string, string][]).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Almacén y materiales"
        description="Historial completo de entradas, salidas, devoluciones, ajustes y anulaciones."
        actions={
          <>
            <ButtonLink href="/almacen/devolucion" variant="ghost" icon={<Undo2 className="h-4 w-4" />}>Devolución</ButtonLink>
            <ButtonLink href="/almacen/salida" variant="secondary" icon={<ArrowUpFromLine className="h-4 w-4" />}>Salida a obra</ButtonLink>
            <ButtonLink href="/almacen/entrada" icon={<ArrowDownToLine className="h-4 w-4" />}>Entrada de material</ButtonLink>
          </>
        }
      />
      <InventoryTabs active="/almacen/movimientos" pending={pending ?? 0} />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pr-5 sm:pr-6">
          <FilterBar action="/almacen/movimientos" q={sp.q} placeholder="Nº de documento o albarán">
            <FilterSelect name="tipo" label="Tipo" value={sp.tipo} options={options(INVENTORY_KIND)} />
            <FilterSelect name="obra" label="Obra" value={sp.obra} options={projects} />
            <input type="date" name="desde" defaultValue={sp.desde} aria-label="Desde" className="h-10 rounded-[var(--radius-md)] bg-surface px-3 text-[14px]" />
            <input type="date" name="hasta" defaultValue={sp.hasta} aria-label="Hasta" className="h-10 rounded-[var(--radius-md)] bg-surface px-3 text-[14px]" />
          </FilterBar>
          <div className="pb-3 pl-5 sm:pb-0 sm:pl-0">
            <ButtonLink href={`/api/export/movimientos?${exportQs}`} variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} prefetch={false}>Excel</ButtonLink>
          </div>
        </div>
        <Table minWidth={860}>
          <THead>
            <Th>Documento</Th>
            <Th>Tipo</Th>
            <Th>Fecha</Th>
            <Th>Obra</Th>
            <Th>Trabajador / proveedor</Th>
            <Th>Estado</Th>
          </THead>
          <TBody>
            {(data ?? []).map((d) => {
              const k = INVENTORY_KIND[d.kind];
              return (
                <Tr key={d.id}>
                  <Td>
                    <Link href={`/almacen/movimientos/${d.id}`} className="font-medium text-ink hover:text-brand-600">{d.number}</Link>
                    {d.reference && <p className="text-[12px] text-muted">{d.reference}</p>}
                  </Td>
                  <Td><Badge tone={k.tone}>{k.label}</Badge></Td>
                  <Td className="whitespace-nowrap text-ink-2">{formatDateTime(d.occurred_at)}</Td>
                  <Td className="text-ink-2">{d.project ? `${d.project.code} · ${d.project.name}` : "—"}</Td>
                  <Td className="text-ink-2">{d.employee ? `${d.employee.first_name} ${d.employee.last_name}` : (d.supplier?.name ?? "—")}</Td>
                  <Td>
                    {d.reversed_by_document_id ? (
                      <Badge tone="danger">Anulado</Badge>
                    ) : d.kind === "issue" && d.employee ? (
                      d.received_confirmed_at ? <Badge tone="success">Recibido</Badge> : <Badge tone="warning">Pendiente de confirmar</Badge>
                    ) : (
                      <Badge tone="neutral">Contabilizado</Badge>
                    )}
                  </Td>
                </Tr>
              );
            })}
            {!data?.length && <EmptyRow cols={6}>No hay movimientos con esos filtros.</EmptyRow>}
          </TBody>
        </Table>
        <Pagination page={page} total={count ?? 0} params={sp} basePath="/almacen/movimientos" />
      </Card>
    </div>
  );
}
