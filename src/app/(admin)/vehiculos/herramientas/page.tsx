import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterSelect } from "@/components/ui/FilterBar";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { FleetTabs } from "@/features/fleet/components/FleetTabs";
import { AssignToolDialog, ReturnToolDialog, ToolDialog } from "@/features/fleet/components/forms";
import { activeProjectOptions, employeeOptions } from "@/features/lookups";
import { TOOL_STATUS, options } from "@/lib/labels";
import { ilikeAny } from "@/lib/utils/search";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Herramientas" };

export default async function Page(props: PageProps<"/vehiculos/herramientas">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  let q = supabase.from("tools").select("*").order("code");
  if (sp.q) q = q.or(ilikeAny(["code", "name", "brand", "serial_number"], sp.q));
  if (sp.estado) q = q.eq("status", sp.estado as never);
  const [{ data }, { data: open }, employees, projects] = await Promise.all([
    q,
    supabase.from("tool_assignments").select("tool_id, assigned_at, employee:employees(id, first_name, last_name), project:projects(code)").is("returned_at", null),
    employeeOptions(supabase),
    activeProjectOptions(supabase),
  ]);
  const holder = new Map((open ?? []).map((a) => [a.tool_id, a]));
  return (
    <div className="space-y-6">
      <PageHeader title="Vehículos y herramientas" description="Quién tiene cada herramienta y desde cuándo." actions={<ToolDialog />} />
      <FleetTabs active="/vehiculos/herramientas" />
      <Card className="overflow-hidden">
        <FilterBar action="/vehiculos/herramientas" q={sp.q} placeholder="Código, nombre o nº de serie">
          <FilterSelect name="estado" label="Estado" value={sp.estado} options={options(TOOL_STATUS)} />
        </FilterBar>
        <Table minWidth={900}>
          <THead><Th>Herramienta</Th><Th>Nº de serie</Th><Th>Tiene</Th><Th>Desde</Th><Th>Estado</Th><Th align="right"> </Th></THead>
          <TBody>
            {(data ?? []).map((t) => {
              const h = holder.get(t.id);
              return (
                <Tr key={t.id}>
                  <Td><span className="font-medium">{t.name}</span><p className="text-[12px] text-muted">{t.code}{t.brand ? ` · ${t.brand}` : ""}{t.model ? ` ${t.model}` : ""}</p></Td>
                  <Td className="font-mono text-[13px] text-ink-2">{t.serial_number ?? "—"}</Td>
                  <Td className="text-ink-2">{h?.employee ? <Link className="hover:text-brand-600" href={`/trabajadores/${h.employee.id}`}>{h.employee.first_name} {h.employee.last_name}</Link> : t.location ?? "—"}{h?.project && <span className="text-muted"> · {h.project.code}</span>}</Td>
                  <Td className="text-ink-2">{h ? formatDate(h.assigned_at) : "—"}</Td>
                  <Td><Badge tone={TOOL_STATUS[t.status].tone}>{TOOL_STATUS[t.status].label}</Badge></Td>
                  <Td align="right"><span className="flex justify-end gap-1">{h ? <ReturnToolDialog toolId={t.id} /> : t.status === "available" ? <AssignToolDialog toolId={t.id} employees={employees} projects={projects} /> : null}<ToolDialog t={t} /></span></Td>
                </Tr>
              );
            })}
            {!data?.length && <EmptyRow cols={6}>Sin herramientas registradas.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
