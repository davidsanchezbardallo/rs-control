import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { InventoryTabs } from "@/features/inventory/components/InventoryTabs";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { PackageCheck } from "lucide-react";

export const metadata: Metadata = { title: "Reposición" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const [{ data }, { count: pending }] = await Promise.all([
    supabase.from("v_stock").select("*").eq("is_low", true).eq("status", "active").order("supplier_name").order("name"),
    supabase.from("material_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "in_review", "approved", "prepared"]),
  ]);
  const groups = new Map<string, NonNullable<typeof data>>();
  for (const m of data ?? []) {
    const k = m.supplier_name ?? "Sin proveedor habitual";
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Almacén y materiales" description="Materiales en o por debajo de su stock mínimo, agrupados por proveedor habitual." actions={<ButtonLink href="/almacen/entrada" icon={<ArrowDownToLine className="h-4 w-4" />}>Registrar entrada</ButtonLink>} />
      <InventoryTabs active="/almacen/reposicion" pending={pending ?? 0} />
      {groups.size === 0 && (
        <Card><EmptyState icon={PackageCheck} title="Todo en orden" description="Ningún material está por debajo de su stock mínimo." /></Card>
      )}
      {[...groups.entries()].map(([supplier, items]) => (
        <Card key={supplier} className="overflow-hidden">
          <CardHeader title={supplier} description={`${items.length} materiales para reponer`} />
          <Table className="mt-4">
            <THead>
              <Th>Material</Th>
              <Th align="right">Stock</Th>
              <Th align="right">Mínimo</Th>
              <Th align="right">Sugerido</Th>
              <Th align="right">Último coste</Th>
            </THead>
            <TBody>
              {items.map((m) => {
                const suggested = Math.max(0, Number(m.min_stock) * 2 - Number(m.quantity));
                return (
                  <Tr key={m.id!}>
                    <Td>
                      <Link href={`/almacen/materiales/${m.id}`} className="font-medium text-ink hover:text-brand-600">{m.name}</Link>
                      <p className="text-[12px] text-muted">{m.code} · {m.location ?? "sin ubicación"}</p>
                    </Td>
                    <Td align="right" className="font-medium text-warning">{formatNumber(Number(m.quantity))} {m.unit_code}</Td>
                    <Td align="right" className="text-ink-2">{formatNumber(Number(m.min_stock))}</Td>
                    <Td align="right">{formatNumber(suggested)} {m.unit_code}</Td>
                    <Td align="right" className="text-ink-2">{formatCurrency(Number(m.avg_unit_cost))}</Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </Card>
      ))}
    </div>
  );
}
