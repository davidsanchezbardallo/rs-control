import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterSelect } from "@/components/ui/FilterBar";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { EMPLOYEE_STATUS, options } from "@/lib/labels";
import { ilikeAny } from "@/lib/utils/search";

export const metadata: Metadata = { title: "Trabajadores" };

export default async function Page(props: PageProps<"/trabajadores">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  let q = supabase.from("employees").select("id, code, first_name, last_name, job_title, phone, status").order("first_name");
  if (sp.q) q = q.or(ilikeAny(["first_name", "last_name", "code", "job_title"], sp.q));
  if (sp.estado) q = q.eq("status", sp.estado as never);
  else q = q.neq("status", "inactive");
  const [{ data }, { data: assign }, { data: veh }, { data: profiles }, { data: alerts }] = await Promise.all([
    q,
    supabase.from("project_assignments").select("employee_id, project:projects(code, name)").is("end_date", null),
    supabase.from("vehicle_assignments").select("employee_id, vehicle:vehicles(plate)").is("end_date", null),
    supabase.from("profiles").select("employee_id, is_active").not("employee_id", "is", null),
    supabase.from("v_alerts").select("kind, link").in("kind", ["document", "training", "ppe"]),
  ]);
  const projBy = new Map<string, string[]>();
  for (const a of assign ?? []) projBy.set(a.employee_id, [...(projBy.get(a.employee_id) ?? []), a.project?.code ?? ""]);
  const vehBy = new Map((veh ?? []).map((v) => [v.employee_id, v.vehicle?.plate]));
  const access = new Map((profiles ?? []).map((p) => [p.employee_id, p.is_active]));
  const alertBy = new Map<string, number>();
  for (const a of alerts ?? []) {
    const id = a.link?.split("/trabajadores/")[1];
    if (id) alertBy.set(id, (alertBy.get(id) ?? 0) + 1);
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Trabajadores" description="Fichas, documentación, vacaciones, formación y asignaciones." actions={<><ButtonLink href="/trabajadores/calendario" variant="secondary" icon={<CalendarDays className="h-4 w-4" />}>Calendario de ausencias</ButtonLink><ButtonLink href="/trabajadores/nuevo" icon={<Plus className="h-4 w-4" />}>Nuevo trabajador</ButtonLink></>} />
      <Card className="overflow-hidden">
        <FilterBar action="/trabajadores" q={sp.q} placeholder="Nombre, código o puesto">
          <FilterSelect name="estado" label="Estado" value={sp.estado} options={options(EMPLOYEE_STATUS)} />
        </FilterBar>
        <Table minWidth={860}>
          <THead><Th>Trabajador</Th><Th>Puesto</Th><Th>Obras actuales</Th><Th>Vehículo</Th><Th>Acceso app</Th><Th>Estado</Th></THead>
          <TBody>
            {(data ?? []).map((e) => (
              <Tr key={e.id}>
                <Td>
                  <Link href={`/trabajadores/${e.id}`} className="font-medium text-ink hover:text-brand-600">{e.first_name} {e.last_name}</Link>
                  <p className="text-[12px] text-muted">{e.code}{e.phone ? ` · ${e.phone}` : ""}</p>
                </Td>
                <Td className="text-ink-2">{e.job_title ?? "—"}</Td>
                <Td className="text-ink-2">{projBy.get(e.id)?.join(", ") || "—"}</Td>
                <Td className="text-ink-2">{vehBy.get(e.id) ?? "—"}</Td>
                <Td>{access.has(e.id) ? (access.get(e.id) ? <Badge tone="success">Activo</Badge> : <Badge>Desactivado</Badge>) : <Badge tone="warning">Sin cuenta</Badge>}</Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone={EMPLOYEE_STATUS[e.status].tone}>{EMPLOYEE_STATUS[e.status].label}</Badge>
                    {alertBy.get(e.id) ? <Badge tone="warning">{alertBy.get(e.id)} avisos</Badge> : null}
                  </span>
                </Td>
              </Tr>
            ))}
            {!data?.length && <EmptyRow cols={6}>No hay trabajadores con esos filtros.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
