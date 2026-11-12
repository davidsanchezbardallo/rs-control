import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, Download, Euro, PackageX, Plus, SlidersHorizontal } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterSelect } from "@/components/ui/FilterBar";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { Pagination, pageRange } from "@/components/ui/Pagination";
import { InventoryTabs } from "@/features/inventory/components/InventoryTabs";
import { categoryOptions } from "@/features/lookups";
import { ilikeAny } from "@/lib/utils/search";
import { formatCurrency, formatCurrencyRounded, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Almacén" };

export default async function StockPage(props: PageProps<"/almacen">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const { from, to } = pageRange(page);

  let q = supabase.from("v_stock").select("*", { count: "exact" }).eq("status", "active").order("name");
  if (sp.q) q = q.or(ilikeAny(["name", "code", "brand", "model_ref"], sp.q));
  if (sp.cat) q = q.eq("category_id", sp.cat);
  if (sp.estado === "bajo") q = q.eq("is_low", true);
  if (sp.estado === "sin") q = q.lte("quantity", 0);

  const [{ data: rows, count }, { data: totals }, cats, { count: pending }] = await Promise.all([
    q.range(from, to),
    supabase.from("v_stock").select("stock_value, is_low, quantity").eq("status", "active"),
    categoryOptions(supabase),
    supabase.from("material_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "in_review", "approved", "prepared"]),
  ]);
  const value = (totals ?? []).reduce((s, r) => s + Number(r.stock_value), 0);
  const low = (totals ?? []).filter((r) => r.is_low).length;
  const out = (totals ?? []).filter((r) => Number(r.quantity) <= 0).length;
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([, v]) => !!v) as [string, string][]).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Almacén y materiales"
        description="Stock de la nave central, valorado a precio medio ponderado."
        actions={
          <>
            <ButtonLink href="/almacen/ajuste" variant="ghost" icon={<SlidersHorizontal className="h-4 w-4" />}>Ajuste</ButtonLink>
            <ButtonLink href="/almacen/salida" variant="secondary" icon={<ArrowUpFromLine className="h-4 w-4" />}>Salida a obra</ButtonLink>
            <ButtonLink href="/almacen/entrada" icon={<ArrowDownToLine className="h-4 w-4" />}>Entrada de material</ButtonLink>
          </>
        }
      />
      <InventoryTabs active="/almacen" pending={pending ?? 0} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Valor del inventario" value={formatCurrencyRounded(value)} icon={Euro} />
        <StatCard label="Materiales activos" value={formatNumber(totals?.length ?? 0)} icon={Boxes} />
        <StatCard label="Stock bajo" value={formatNumber(low)} icon={AlertTriangle} emphasis={low ? "warning" : undefined} detail={<Link href="/almacen?estado=bajo" className="text-brand-600">Ver materiales</Link>} />
        <StatCard label="Sin stock" value={formatNumber(out)} icon={PackageX} emphasis={out ? "danger" : undefined} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pr-5 sm:pr-6">
          <FilterBar action="/almacen" q={sp.q} placeholder="Nombre, código, marca o referencia">
            <FilterSelect name="cat" label="Categoría" value={sp.cat} options={cats} />
            <FilterSelect name="estado" label="Disponibilidad" value={sp.estado} options={[{ value: "bajo", label: "Stock bajo" }, { value: "sin", label: "Sin stock" }]} />
          </FilterBar>
          <div className="flex gap-2 pb-3 pl-5 sm:pt-1 sm:pb-0 sm:pl-0">
            <ButtonLink href={`/api/export/stock?${exportQs}`} variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} prefetch={false}>Excel</ButtonLink>
            <ButtonLink href="/almacen/materiales/nuevo" variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />}>Nuevo material</ButtonLink>
          </div>
        </div>
        <Table minWidth={860}>
          <THead>
            <Th>Material</Th>
            <Th>Categoría</Th>
            <Th>Ubicación</Th>
            <Th align="right">Stock</Th>
            <Th align="right">Mínimo</Th>
            <Th align="right">Coste medio</Th>
            <Th align="right">Valor</Th>
          </THead>
          <TBody>
            {(rows ?? []).map((m) => (
              <Tr key={m.id!}>
                <Td>
                  <Link href={`/almacen/materiales/${m.id}`} className="font-medium text-ink hover:text-brand-600">{m.name}</Link>
                  <p className="text-[12px] text-muted">{m.code}{m.brand ? ` · ${m.brand}` : ""}{m.model_ref ? ` · ${m.model_ref}` : ""}</p>
                </Td>
                <Td className="text-ink-2">{m.category_name ?? "—"}</Td>
                <Td className="text-ink-2">{m.location ?? "—"}</Td>
                <Td align="right">
                  <span className="inline-flex items-center gap-2">
                    {Number(m.quantity) <= 0 ? <Badge tone="danger">Sin stock</Badge> : m.is_low ? <Badge tone="warning">Bajo</Badge> : null}
                    <span className="font-medium text-ink">{formatNumber(Number(m.quantity))}</span>
                    <span className="text-muted">{m.unit_code}</span>
                  </span>
                </Td>
                <Td align="right" className="text-ink-2">{formatNumber(Number(m.min_stock))}</Td>
                <Td align="right" className="text-ink-2">{formatCurrency(Number(m.avg_unit_cost))}</Td>
                <Td align="right" className="font-medium">{formatCurrency(Number(m.stock_value))}</Td>
              </Tr>
            ))}
            {!rows?.length && <EmptyRow cols={7}>No hay materiales con esos filtros.</EmptyRow>}
          </TBody>
        </Table>
        <Pagination page={page} total={count ?? 0} params={sp} basePath="/almacen" />
      </Card>
    </div>
  );
}
