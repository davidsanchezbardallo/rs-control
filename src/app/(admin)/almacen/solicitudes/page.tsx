import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterSelect } from "@/components/ui/FilterBar";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { Pagination, pageRange } from "@/components/ui/Pagination";
import { InventoryTabs } from "@/features/inventory/components/InventoryTabs";
import { PRIORITY, REQUEST_STATUS, options } from "@/lib/labels";
import { formatDate, formatDateTime, plural } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Solicitudes de material" };
const OPEN = ["pending", "in_review", "approved", "prepared"] as const;

export default async function Page(props: PageProps<"/almacen/solicitudes">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const { from, to } = pageRange(page);
  let q = supabase
    .from("material_requests")
    .select("id, number, status, priority, created_at, needed_by, project:projects(code, name), employee:employees(first_name, last_name), items:material_request_items(id)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (sp.estado === "abiertas" || !sp.estado) q = q.in("status", OPEN as unknown as never[]);
  else if (sp.estado !== "todas") q = q.eq("status", sp.estado as never);
  if (sp.q) q = q.ilike("number", `%${sp.q.replace(/[%,()*.:]/g, "")}%`);
  const [{ data, count }, { count: pending }] = await Promise.all([
    q.range(from, to),
    supabase.from("material_requests").select("id", { count: "exact", head: true }).in("status", OPEN as unknown as never[]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Almacén y materiales" description="Solicitudes de los trabajadores. Una solicitud no descuenta stock hasta que se entrega." />
      <InventoryTabs active="/almacen/solicitudes" pending={pending ?? 0} />
      <Card className="overflow-hidden">
        <FilterBar action="/almacen/solicitudes" q={sp.q} placeholder="Nº de solicitud">
          <FilterSelect name="estado" label="Estado" value={sp.estado ?? "abiertas"} options={[{ value: "abiertas", label: "Abiertas" }, { value: "todas", label: "Todas" }, ...options(REQUEST_STATUS)]} />
        </FilterBar>
        <Table minWidth={820}>
          <THead>
            <Th>Solicitud</Th>
            <Th>Obra</Th>
            <Th>Trabajador</Th>
            <Th>Prioridad</Th>
            <Th>Para</Th>
            <Th>Estado</Th>
          </THead>
          <TBody>
            {(data ?? []).map((r) => (
              <Tr key={r.id}>
                <Td>
                  <Link href={`/almacen/solicitudes/${r.id}`} className="font-medium text-ink hover:text-brand-600">{r.number}</Link>
                  <p className="text-[12px] text-muted">{formatDateTime(r.created_at)} · {plural(r.items.length, "artículo", "artículos")}</p>
                </Td>
                <Td className="text-ink-2">{r.project?.code} · {r.project?.name}</Td>
                <Td className="text-ink-2">{r.employee?.first_name} {r.employee?.last_name}</Td>
                <Td><Badge tone={PRIORITY[r.priority].tone}>{PRIORITY[r.priority].label}</Badge></Td>
                <Td className="text-ink-2">{r.needed_by ? formatDate(r.needed_by) : "—"}</Td>
                <Td><Badge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</Badge></Td>
              </Tr>
            ))}
            {!data?.length && <EmptyRow cols={6}>No hay solicitudes con ese filtro.</EmptyRow>}
          </TBody>
        </Table>
        <Pagination page={page} total={count ?? 0} params={sp} basePath="/almacen/solicitudes" />
      </Card>
    </div>
  );
}
