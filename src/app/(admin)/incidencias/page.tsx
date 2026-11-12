import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterSelect } from "@/components/ui/FilterBar";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { Pagination, pageRange } from "@/components/ui/Pagination";
import { INCIDENT_STATUS, SEVERITY, options } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Incidencias" };

export default async function Page(props: PageProps<"/incidencias">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const { from, to } = pageRange(page);
  let q = supabase.from("incidents").select("id, number, title, severity, status, created_at, photo_paths, project:projects(code, name), vehicle:vehicles(plate), reporter:employees(first_name, last_name)", { count: "exact" }).order("created_at", { ascending: false });
  if (!sp.estado || sp.estado === "abiertas") q = q.neq("status", "resolved");
  else if (sp.estado !== "todas") q = q.eq("status", sp.estado as never);
  if (sp.q) q = q.or(`title.ilike.%${sp.q.replace(/[%,()*.:]/g, "")}%,number.ilike.%${sp.q.replace(/[%,()*.:]/g, "")}%`);
  const { data, count } = await q.range(from, to);
  return (
    <div className="space-y-6">
      <PageHeader title="Incidencias" description="Comunicadas por los trabajadores desde obra o sobre vehículos." actions={<ButtonLink href="/incidencias/nueva" variant="secondary" icon={<Plus className="h-4 w-4" />}>Registrar incidencia</ButtonLink>} />
      <Card className="overflow-hidden">
        <FilterBar action="/incidencias" q={sp.q} placeholder="Título o número">
          <FilterSelect name="estado" label="Estado" value={sp.estado ?? "abiertas"} options={[{ value: "abiertas", label: "Sin resolver" }, { value: "todas", label: "Todas" }, ...options(INCIDENT_STATUS)]} />
        </FilterBar>
        <Table minWidth={820}>
          <THead><Th>Incidencia</Th><Th>Obra / vehículo</Th><Th>Comunicada por</Th><Th>Gravedad</Th><Th>Estado</Th></THead>
          <TBody>
            {(data ?? []).map((i) => (
              <Tr key={i.id}>
                <Td>
                  <Link href={`/incidencias/${i.id}`} className="font-medium text-ink hover:text-brand-600">{i.title}</Link>
                  <p className="text-[12px] text-muted">{i.number} · {formatDateTime(i.created_at)}{i.photo_paths.length ? ` · ${i.photo_paths.length} fotos` : ""}</p>
                </Td>
                <Td className="text-ink-2">{i.project ? `${i.project.code} · ${i.project.name}` : i.vehicle ? `Vehículo ${i.vehicle.plate}` : "—"}</Td>
                <Td className="text-ink-2">{i.reporter ? `${i.reporter.first_name} ${i.reporter.last_name}` : "Administración"}</Td>
                <Td><Badge tone={SEVERITY[i.severity].tone}>{SEVERITY[i.severity].label}</Badge></Td>
                <Td><Badge tone={INCIDENT_STATUS[i.status].tone}>{INCIDENT_STATUS[i.status].label}</Badge></Td>
              </Tr>
            ))}
            {!data?.length && <EmptyRow cols={5}>No hay incidencias con ese filtro.</EmptyRow>}
          </TBody>
        </Table>
        <Pagination page={page} total={count ?? 0} params={sp} basePath="/incidencias" />
      </Card>
    </div>
  );
}
