import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { DocumentsCard } from "@/features/documents/components/DocumentsCard";
import { AbsenceDialog, CreateAccountDialog, EditEmployeeDialog, PpeDialog, ResetPasswordDialog, ToggleAccountButton, TrainingDialog } from "@/features/employees/components/forms";
import { todayISO } from "@/features/lookups";
import { ABSENCE_KIND, EMPLOYEE_STATUS, INVENTORY_KIND } from "@/lib/labels";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { dueTone } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Trabajador" };

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ".");
}

export default async function Page(props: PageProps<"/trabajadores/[id]">) {
  const { id } = await props.params;
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const tab = sp.tab ?? "ficha";
  const { supabase } = await requireAdmin();
  const { data: e } = await supabase.from("employees").select("*, category:labor_cost_categories(name, hourly_cost)").eq("id", id).maybeSingle();
  if (!e) notFound();
  const year = new Date().getFullYear();
  const [{ data: profile }, { data: cats }, { data: company }, { data: abs }] = await Promise.all([
    supabase.from("profiles").select("id, username, is_active, role").eq("employee_id", id).maybeSingle(),
    supabase.from("labor_cost_categories").select("id, name").eq("is_active", true),
    supabase.from("companies").select("settings").single(),
    supabase.from("absences").select("*").eq("employee_id", id).order("start_date", { ascending: false }),
  ]);
  const allowance = Number((company?.settings as { vacation_days_per_year?: number } | null)?.vacation_days_per_year ?? 30);
  const used = (abs ?? []).filter((a) => a.kind === "vacation" && a.status === "approved" && a.start_date.startsWith(String(year))).reduce((s, a) => s + Number(a.days), 0);
  const base = `/trabajadores/${id}`;

  return (
    <div className="space-y-6">
      <BackLink href="/trabajadores">Trabajadores</BackLink>
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><span className="font-mono">{e.code}</span><Badge tone={EMPLOYEE_STATUS[e.status].tone}>{EMPLOYEE_STATUS[e.status].label}</Badge></span>}
        title={`${e.first_name} ${e.last_name}`}
        description={e.job_title ?? undefined}
        actions={<EditEmployeeDialog e={e} costCategories={(cats ?? []).map((c) => ({ value: c.id, label: c.name }))} />}
      />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label={`Vacaciones ${year}`} value={`${formatNumber(allowance - used)} días`} detail={`Disfrutados ${formatNumber(used)} de ${allowance}`} />
        <StatCard label="Categoría de coste" value={e.category?.name ?? "—"} detail={e.category ? `${formatNumber(Number(e.category.hourly_cost))} €/h` : undefined} />
        <StatCard label="Incorporación" value={e.hire_date ? formatDate(e.hire_date) : "—"} />
        <StatCard label="Acceso a la app" value={profile ? (profile.is_active ? "Activo" : "Desactivado") : "Sin cuenta"} detail={profile ? `Usuario ${profile.username}` : undefined} />
      </div>
      <Tabs
        active={`${base}?tab=${tab}`}
        items={[
          { href: `${base}?tab=ficha`, label: "Ficha" },
          { href: `${base}?tab=documentos`, label: "Documentos" },
          { href: `${base}?tab=ausencias`, label: "Vacaciones y ausencias" },
          { href: `${base}?tab=formacion`, label: "Formación y EPIs" },
          { href: `${base}?tab=asignaciones`, label: "Asignaciones" },
        ]}
      />
      {tab === "ficha" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Datos personales y laborales" description="DNI/NIE y notas: solo visibles para administración." />
            <CardBody>
              <DescriptionList
                items={[
                  { label: "DNI / NIE", value: e.national_id },
                  { label: "Teléfono", value: e.phone && <a className="text-brand-600" href={`tel:${e.phone}`}>{e.phone}</a> },
                  { label: "Email", value: e.email },
                  { label: "Puesto", value: e.job_title },
                  { label: "Fecha de incorporación", value: e.hire_date ? formatDate(e.hire_date) : null },
                  { label: "Fecha de baja", value: e.end_date ? formatDate(e.end_date) : null },
                ]}
              />
              {e.notes && <p className="mt-5 rounded-[var(--radius-md)] bg-surface px-4 py-3 text-[14px] text-ink-2">{e.notes}</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Acceso a RS Control" description="Usuario y contraseña para la app del móvil." />
            <CardBody className="space-y-3">
              {profile ? (
                <>
                  <p className="text-[14px] text-ink-2">Usuario: <span className="font-mono font-medium text-ink">{profile.username}</span></p>
                  <div className="flex flex-wrap gap-2">
                    <ResetPasswordDialog profileId={profile.id} />
                    <ToggleAccountButton profileId={profile.id} active={profile.is_active} />
                  </div>
                </>
              ) : (
                <CreateAccountDialog employeeId={id} fullName={`${e.first_name} ${e.last_name}`} suggestedUsername={`${norm(e.first_name)}.${norm(e.last_name.split(" ")[0] ?? "")}`} />
              )}
            </CardBody>
          </Card>
        </div>
      )}
      {tab === "documentos" && (
        <DocumentsCard supabase={supabase} entity="employee" entityId={id} title="Documentación del trabajador" defaultCategory="contract" categories={["id_document", "contract", "medical_fitness", "training", "prl", "site_access", "ppe", "other"]} />
      )}
      {tab === "ausencias" && (
        <Card className="overflow-hidden">
          <CardHeader title="Vacaciones y ausencias" description="Por protección de datos, las bajas se registran sin diagnóstico." action={<AbsenceDialog employeeId={id} />} />
          <Table className="mt-3">
            <THead><Th>Tipo</Th><Th>Desde</Th><Th>Hasta</Th><Th align="right">Días</Th><Th>Observaciones</Th></THead>
            <TBody>
              {(abs ?? []).map((a) => (
                <Tr key={a.id}>
                  <Td><Badge tone={a.kind === "vacation" ? "brand" : "neutral"}>{ABSENCE_KIND[a.kind]}</Badge></Td>
                  <Td>{formatDate(a.start_date)}</Td>
                  <Td>{formatDate(a.end_date)}</Td>
                  <Td align="right">{formatNumber(Number(a.days))}</Td>
                  <Td className="text-ink-2">{a.notes ?? "—"}</Td>
                </Tr>
              ))}
              {!abs?.length && <EmptyRow cols={5}>Sin ausencias registradas.</EmptyRow>}
            </TBody>
          </Table>
        </Card>
      )}
      {tab === "formacion" && <Training id={id} />}
      {tab === "asignaciones" && <Assignments id={id} />}
    </div>
  );
}

async function Training({ id }: { id: string }) {
  const { supabase } = await requireAdmin();
  const [{ data: tr }, { data: ppe }] = await Promise.all([
    supabase.from("trainings").select("*").eq("employee_id", id).order("completed_on", { ascending: false }),
    supabase.from("ppe_deliveries").select("*").eq("employee_id", id).order("delivered_on", { ascending: false }),
  ]);
  const today = todayISO();
  const expBadge = (d: string | null) => (d ? <Badge tone={dueTone(d)}>{formatDate(d)}</Badge> : "—");
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="overflow-hidden">
        <CardHeader title="Formación y acreditaciones" action={<TrainingDialog employeeId={id} />} />
        <Table className="mt-3" minWidth={480}>
          <THead><Th>Formación</Th><Th>Realizada</Th><Th>Caduca</Th></THead>
          <TBody>
            {(tr ?? []).map((t) => (
              <Tr key={t.id}><Td><span className="font-medium">{t.name}</span><p className="text-[12px] text-muted">{[t.provider, t.hours ? `${formatNumber(Number(t.hours))} h` : null].filter(Boolean).join(" · ")}</p></Td><Td>{t.completed_on ? formatDate(t.completed_on) : "—"}</Td><Td>{expBadge(t.expires_on)}</Td></Tr>
            ))}
            {!tr?.length && <EmptyRow cols={3}>Sin formación registrada.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Entregas de EPIs" action={<PpeDialog employeeId={id} today={today} />} />
        <Table className="mt-3" minWidth={480}>
          <THead><Th>EPI</Th><Th>Entregado</Th><Th>Renovar</Th><Th>Firma</Th></THead>
          <TBody>
            {(ppe ?? []).map((x) => (
              <Tr key={x.id}><Td><span className="font-medium">{x.item}</span><p className="text-[12px] text-muted">{x.quantity} ud</p></Td><Td>{formatDate(x.delivered_on)}</Td><Td>{expBadge(x.next_renewal_on)}</Td><Td>{x.acknowledged ? <Badge tone="success">Firmado</Badge> : <Badge tone="warning">Pendiente</Badge>}</Td></Tr>
            ))}
            {!ppe?.length && <EmptyRow cols={4}>Sin entregas registradas.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

async function Assignments({ id }: { id: string }) {
  const { supabase } = await requireAdmin();
  const [{ data: pa }, { data: va }, { data: ta }, { data: docs }] = await Promise.all([
    supabase.from("project_assignments").select("id, start_date, end_date, role_in_project, project:projects(id, code, name)").eq("employee_id", id).order("start_date", { ascending: false }),
    supabase.from("vehicle_assignments").select("id, start_date, end_date, vehicle:vehicles(id, plate, brand, model)").eq("employee_id", id).order("start_date", { ascending: false }),
    supabase.from("tool_assignments").select("id, assigned_at, returned_at, tool:tools(code, name)").eq("employee_id", id).order("assigned_at", { ascending: false }),
    supabase.from("inventory_documents").select("id, number, kind, occurred_at, project:projects(code)").eq("employee_id", id).order("occurred_at", { ascending: false }).limit(15),
  ]);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <HistoryList title="Obras" items={(pa ?? []).map((a) => ({ key: a.id, current: !a.end_date, main: <Link className="font-medium text-ink hover:text-brand-600" href={`/obras/${a.project?.id}`}>{a.project?.code} · {a.project?.name}</Link>, sub: `${a.role_in_project ?? ""} ${formatDate(a.start_date)}${a.end_date ? ` → ${formatDate(a.end_date)}` : ""}` }))} />
      <HistoryList title="Vehículos" items={(va ?? []).map((a) => ({ key: a.id, current: !a.end_date, main: <Link className="font-medium text-ink hover:text-brand-600" href={`/vehiculos/${a.vehicle?.id}`}>{a.vehicle?.plate} · {a.vehicle?.brand} {a.vehicle?.model}</Link>, sub: `${formatDate(a.start_date)}${a.end_date ? ` → ${formatDate(a.end_date)}` : ""}` }))} />
      <HistoryList title="Herramientas" items={(ta ?? []).map((a) => ({ key: a.id, current: !a.returned_at, main: <span className="font-medium">{a.tool?.code} · {a.tool?.name}</span>, sub: `${formatDateTime(a.assigned_at)}${a.returned_at ? ` → ${formatDateTime(a.returned_at)}` : ""}` }))} />
      <HistoryList title="Últimos movimientos de material" items={(docs ?? []).map((d) => ({ key: d.id, current: false, main: <Link className="font-medium text-ink hover:text-brand-600" href={`/almacen/movimientos/${d.id}`}>{d.number} · {INVENTORY_KIND[d.kind].label}</Link>, sub: `${d.project?.code ?? ""} · ${formatDateTime(d.occurred_at)}` }))} />
    </div>
  );
}

function HistoryList({ title, items }: { title: string; items: { key: string; main: React.ReactNode; sub: string; current: boolean }[] }) {
  return (
    <Card>
      <CardHeader title={title} />
      <ul className="mt-3 divide-y divide-line">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-3 px-6 py-3 text-[14px]">
            <div className="min-w-0 flex-1">{i.main}<p className="text-[12px] text-muted">{i.sub}</p></div>
            {i.current && <Badge tone="success">Actual</Badge>}
          </li>
        ))}
        {!items.length && <li className="px-6 py-6 text-center text-[14px] text-muted">Sin registros.</li>}
      </ul>
    </Card>
  );
}
