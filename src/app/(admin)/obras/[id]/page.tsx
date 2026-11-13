import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpFromLine, MapPin } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { ButtonLink } from "@/components/ui/Button";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { DocumentsCard } from "@/features/documents/components/DocumentsCard";
import { AssignForm, BudgetItemDialog, EditProjectDialog, EndAssignmentButton, EstimatesDialog, ExpenseDialog, StatusForm } from "@/features/projects/components/forms";
import { projectProfit } from "@/features/projects/finance";
import { clientOptions, employeeOptions, todayISO } from "@/features/lookups";
import { BUDGET_KIND, COST_CATEGORY, INCIDENT_STATUS, WORK_REPORT_STATUS, INVENTORY_KIND, PROJECT_STATUS, SEVERITY } from "@/lib/labels";
import { formatCurrency, formatCurrencyRounded, formatDate, formatDateTime, formatNumber, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Obra" };

export default async function Page(props: PageProps<"/obras/[id]">) {
  const { id } = await props.params;
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const tab = sp.tab ?? "resumen";
  const { supabase } = await requireAdmin();
  const { data: p } = await supabase.from("projects").select("*, client:clients(id, name, tax_id), manager:employees!projects_manager_employee_id_fkey(first_name, last_name)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: fin }, clients, employees] = await Promise.all([
    supabase.from("v_project_financials").select("*").eq("project_id", id).single(),
    clientOptions(supabase),
    employeeOptions(supabase),
  ]);
  const f = projectProfit(fin!);
  const base = `/obras/${id}`;

  return (
    <div className="space-y-6">
      <BackLink href="/obras">Obras</BackLink>
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><span className="font-mono">{p.code}</span><Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge></span>}
        title={p.name}
        description={<span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{[p.address, p.city].filter(Boolean).join(", ") || "Sin dirección"}{p.client ? ` · ${p.client.name}` : ""}</span>}
        actions={
          <>
            <ButtonLink href={`/almacen/salida?obra=${id}`} variant="ghost" icon={<ArrowUpFromLine className="h-4 w-4" />}>Salida de material</ButtonLink>
            <EditProjectDialog p={p} clients={clients} employees={employees} />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Presupuesto" value={formatCurrencyRounded(f.plannedIncome)} detail={`Margen previsto ${f.plannedMarginPct === null ? "—" : formatPercent(f.plannedMarginPct)}`} />
        <StatCard label="Facturado" value={formatCurrencyRounded(f.realIncome)} detail={`Cobrado ${formatCurrencyRounded(f.collected)}`} />
        <StatCard label="Coste real" value={formatCurrencyRounded(f.realCost)} detail={f.costProgress === null ? "Sin costes previstos" : `${formatPercent(f.costProgress, 0)} de lo previsto`} emphasis={f.costProgress !== null && f.costProgress > 1 ? "danger" : undefined} />
        <StatCard label="Margen real" value={f.marginPct === null ? "—" : formatPercent(f.marginPct)} detail={formatCurrencyRounded(f.margin)} emphasis={f.marginPct !== null && f.marginPct < 0.1 ? "warning" : undefined} />
      </div>
      <Tabs
        active={`${base}?tab=${tab}`}
        items={[
          { href: `${base}?tab=resumen`, label: "Resumen" },
          { href: `${base}?tab=economico`, label: "Económico" },
          { href: `${base}?tab=material`, label: "Material" },
          { href: `${base}?tab=documentos`, label: "Documentos" },
          { href: `${base}?tab=partes`, label: "Partes" },
          { href: `${base}?tab=incidencias`, label: "Incidencias" },
          { href: `${base}?tab=historial`, label: "Historial" },
        ]}
      />
      {tab === "resumen" && <Summary id={id} p={p} employees={employees} />}
      {tab === "economico" && <Economic id={id} f={f} employees={employees} />}
      {tab === "material" && <Material id={id} />}
      {tab === "documentos" && <DocumentsCard supabase={supabase} entity="project" entityId={id} title="Documentación de la obra" defaultCategory="plan" categories={["budget", "plan", "certification", "invoice", "photo", "work_report", "delivery_note", "contract", "site_access", "other"]} />}
      {tab === "partes" && <WorkReports id={id} />}
      {tab === "incidencias" && <Incidents id={id} />}
      {tab === "historial" && <History id={id} />}
    </div>
  );
}

async function Summary({ id, p, employees }: { id: string; p: { id: string; status: string; start_date: string | null; planned_end_date: string | null; actual_end_date: string | null; work_type: string | null; description: string | null; notes: string | null; client: { id: string; name: string; tax_id: string | null } | null; manager: { first_name: string; last_name: string } | null }; employees: { value: string; label: string }[] }) {
  const { supabase } = await requireAdmin();
  const { data: team } = await supabase.from("project_assignments").select("id, role_in_project, start_date, end_date, employee:employees(id, first_name, last_name, job_title)").eq("project_id", id).order("end_date", { ascending: true, nullsFirst: true }).order("start_date", { ascending: false });
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader title="Datos de la obra" />
        <CardBody>
          <DescriptionList
            items={[
              { label: "Cliente", value: p.client ? <Link className="text-brand-600" href={`/contactos?tipo=clientes&q=${encodeURIComponent(p.client.name)}`}>{p.client.name}</Link> : null },
              { label: "CIF/NIF", value: p.client?.tax_id },
              { label: "Tipo de trabajo", value: p.work_type },
              { label: "Responsable", value: p.manager ? `${p.manager.first_name} ${p.manager.last_name}` : null },
              { label: "Inicio", value: p.start_date ? formatDate(p.start_date) : null },
              { label: "Fin previsto", value: p.planned_end_date ? formatDate(p.planned_end_date) : null },
              { label: "Fin real", value: p.actual_end_date ? formatDate(p.actual_end_date) : null },
            ]}
          />
          {p.description && <p className="mt-5 text-[14px] text-ink-2">{p.description}</p>}
          {p.notes && <p className="mt-3 rounded-[var(--radius-md)] bg-surface px-4 py-3 text-[14px] text-ink-2">Interno: {p.notes}</p>}
          <div className="mt-6 max-w-md"><StatusForm id={p.id} status={p.status} /></div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Equipo" description="Trabajadores asignados" action={<AssignForm projectId={id} employees={employees} />} />
        <ul className="mt-3 divide-y divide-line">
          {(team ?? []).map((a) => (
            <li key={a.id} className={cn("flex items-center gap-3 px-5 py-3 sm:px-6", a.end_date && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <Link href={`/trabajadores/${a.employee?.id}`} className="text-[14px] font-medium text-ink hover:text-brand-600">{a.employee?.first_name} {a.employee?.last_name}</Link>
                <p className="text-[12px] text-muted">{a.role_in_project ?? a.employee?.job_title ?? "—"} · {formatDate(a.start_date)}{a.end_date ? ` → ${formatDate(a.end_date)}` : " · actual"}</p>
              </div>
              {!a.end_date && <EndAssignmentButton id={a.id} />}
            </li>
          ))}
          {!team?.length && <li className="px-6 py-8 text-center text-[14px] text-muted">Sin trabajadores asignados.</li>}
        </ul>
      </Card>
    </div>
  );
}

async function Economic({ id, f, employees }: { id: string; f: ReturnType<typeof projectProfit>; employees: { value: string; label: string }[] }) {
  const { supabase } = await requireAdmin();
  const [{ data: budget }, { data: est }, { data: exp }, { data: invs }, { data: rate }] = await Promise.all([
    supabase.from("project_budget_items").select("*").eq("project_id", id).order("item_date"),
    supabase.from("project_cost_estimates").select("category, amount").eq("project_id", id),
    supabase.from("project_expenses").select("*, employee:employees(first_name, last_name)").eq("project_id", id).order("expense_date", { ascending: false }),
    supabase.from("v_invoices").select("id, number, direction, issue_date, base_amount, total_amount, paid_amount, status, destination, party_name").eq("project_id", id).order("issue_date"),
    supabase.from("labor_cost_categories").select("hourly_cost").eq("is_active", true).order("hourly_cost", { ascending: false }).limit(1),
  ]);
  const estimates = Object.fromEntries((est ?? []).map((e) => [e.category, Number(e.amount)]));
  const fin = await supabase.from("v_project_financials").select("*").eq("project_id", id).single();
  const r = fin.data!;
  const costRows = [
    { k: "material", label: "Materiales (desde almacén)", real: Number(r.material_cost) },
    { k: "labor", label: "Mano de obra", real: Number(r.labor_cost) },
    { k: "subcontract", label: "Facturas de proveedores imputadas", real: Number(r.supplier_invoices_cost) },
    { k: "other", label: "Otros gastos (desplazamientos, alquileres…)", real: Number(r.other_expenses) },
  ];
  const estFor = (k: string) => (k === "other" ? (estimates.travel ?? 0) + (estimates.rental ?? 0) + (estimates.other ?? 0) : (estimates[k] ?? 0));
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Ingresos" description="Presupuestos, certificaciones y facturación" action={<BudgetItemDialog projectId={id} today={todayISO()} />} />
          <CardBody>
            <DescriptionList
              items={[
                { label: "Ingresos previstos", value: formatCurrency(f.plannedIncome) },
                { label: "Facturado (base imponible)", value: formatCurrency(f.realIncome) },
                { label: "Cobrado", value: <span className="text-success">{formatCurrency(f.collected)}</span> },
                { label: "Pendiente de cobro", value: formatCurrency(f.pendingCollection) },
                { label: "Pendiente de facturar", value: formatCurrency(f.pendingToInvoice) },
                { label: "Certificado", value: formatCurrency(Number(r.certified_amount)) },
              ]}
            />
            <ul className="mt-5 divide-y divide-line rounded-[var(--radius-md)] ring-1 ring-line">
              {(budget ?? []).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
                  <span>{BUDGET_KIND[b.kind]}{b.reference ? ` · ${b.reference}` : ""} <span className="text-muted">· {formatDate(b.item_date)}</span></span>
                  <span className="tabular font-medium">{formatCurrency(Number(b.amount))}</span>
                </li>
              ))}
              {!budget?.length && <li className="px-4 py-3 text-[14px] text-muted">Sin presupuestos registrados.</li>}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Costes" description="Real frente a previsto (sin IVA)" action={<EstimatesDialog projectId={id} values={estimates} />} />
          <Table className="mt-3" minWidth={420}>
            <THead><Th>Partida</Th><Th align="right">Previsto</Th><Th align="right">Real</Th><Th align="right">Desv.</Th></THead>
            <TBody>
              {costRows.map((c) => {
                const e = estFor(c.k);
                const dev = e > 0 && c.real > 0 ? (c.real - e) / e : null;
                return (
                  <Tr key={c.k}>
                    <Td className="text-ink-2">{c.label}</Td>
                    <Td align="right">{formatCurrency(e)}</Td>
                    <Td align="right" className="font-medium">{formatCurrency(c.real)}</Td>
                    <Td align="right" className={cn(dev !== null && dev > 0 ? "text-danger" : "text-success")}>{dev === null ? "—" : formatPercent(dev, 0)}</Td>
                  </Tr>
                );
              })}
              <tr className="border-t border-line-strong font-semibold">
                <td className="px-6 py-3">Total</td>
                <td className="tabular px-3 py-3 text-right">{formatCurrency(f.plannedCost)}</td>
                <td className="tabular px-3 py-3 text-right">{formatCurrency(f.realCost)}</td>
                <td className={cn("tabular px-6 py-3 text-right", (f.costDeviation ?? 0) > 0 ? "text-danger" : "text-success")}>{f.costDeviation === null ? "—" : formatPercent(f.costDeviation, 0)}</td>
              </tr>
            </TBody>
          </Table>
          <div className="grid grid-cols-2 gap-4 border-t border-line px-6 py-4">
            <div><p className="text-[12px] text-muted">Margen bruto</p><p className="tabular text-[20px] font-semibold">{formatCurrency(f.margin)}</p></div>
            <div><p className="text-[12px] text-muted">Rentabilidad</p><p className="tabular text-[20px] font-semibold">{f.marginPct === null ? "—" : formatPercent(f.marginPct)}</p></div>
          </div>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <CardHeader title="Gastos de obra" description="Mano de obra (horas × coste por categoría), desplazamientos, alquileres y otros" action={<ExpenseDialog projectId={id} employees={employees} today={todayISO()} defaultRate={rate?.[0] ? Number(rate[0].hourly_cost) : undefined} />} />
        <Table className="mt-3" minWidth={700}>
          <THead><Th>Fecha</Th><Th>Partida</Th><Th>Concepto</Th><Th align="right">Horas</Th><Th align="right">Importe</Th></THead>
          <TBody>
            {(exp ?? []).map((e) => (
              <Tr key={e.id}>
                <Td className="text-ink-2">{formatDate(e.expense_date)}</Td>
                <Td><Badge>{COST_CATEGORY[e.category]}</Badge></Td>
                <Td>{e.description}{e.employee && <span className="text-muted"> · {e.employee.first_name} {e.employee.last_name}</span>}</Td>
                <Td align="right" className="text-ink-2">{e.hours ? formatNumber(Number(e.hours)) : "—"}</Td>
                <Td align="right" className="font-medium">{formatCurrency(Number(e.amount))}</Td>
              </Tr>
            ))}
            {!exp?.length && <EmptyRow cols={5}>Sin gastos registrados.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Facturas de la obra" action={<ButtonLink href={`/facturas/nueva?obra=${id}`} size="sm" variant="secondary">Registrar factura</ButtonLink>} />
        <Table className="mt-3" minWidth={700}>
          <THead><Th>Factura</Th><Th>Tipo</Th><Th>Fecha</Th><Th align="right">Base</Th><Th align="right">Total</Th><Th align="right">Pagado</Th></THead>
          <TBody>
            {(invs ?? []).map((i) => (
              <Tr key={i.id!}>
                <Td><Link className="font-medium text-brand-600" href={`/facturas/${i.id}`}>{i.number}</Link><p className="text-[12px] text-muted">{i.party_name}</p></Td>
                <Td>{i.direction === "issued" ? "Emitida" : "Recibida"}</Td>
                <Td className="text-ink-2">{formatDate(i.issue_date!)}</Td>
                <Td align="right">{formatCurrency(Number(i.base_amount))}</Td>
                <Td align="right">{formatCurrency(Number(i.total_amount))}</Td>
                <Td align="right">{formatCurrency(Number(i.paid_amount))}</Td>
              </Tr>
            ))}
            {!invs?.length && <EmptyRow cols={6}>Sin facturas asociadas.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

async function Material({ id }: { id: string }) {
  const { supabase } = await requireAdmin();
  const [{ data: moves }, { data: docs }] = await Promise.all([
    supabase.from("stock_movements").select("material_id, project_delta, unit_cost, movement_type, is_reversal, quantity, material:materials(code, name, unit:units(code))").eq("project_id", id),
    supabase.from("inventory_documents").select("id, number, kind, occurred_at, reversed_by_document_id, employee:employees(first_name, last_name)").eq("project_id", id).order("occurred_at", { ascending: false }),
  ]);
  const agg = new Map<string, { code: string; name: string; unit: string; out: number; back: number; damaged: number; cost: number }>();
  for (const m of moves ?? []) {
    const a = agg.get(m.material_id) ?? { code: m.material!.code, name: m.material!.name, unit: m.material!.unit?.code ?? "", out: 0, back: 0, damaged: 0, cost: 0 };
    const sign = m.is_reversal ? -1 : 1;
    if (m.movement_type === "issue_out") a.out += sign * Number(m.quantity);
    if (m.movement_type === "return_in") a.back += sign * Number(m.quantity);
    if (m.movement_type === "return_damaged") a.damaged += sign * Number(m.quantity);
    a.cost += Number(m.project_delta) * Number(m.unit_cost);
    agg.set(m.material_id, a);
  }
  const rows = [...agg.values()].filter((r) => r.out || r.back).sort((a, b) => b.cost - a.cost);
  const total = rows.reduce((s, r) => s + r.cost, 0);
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader title="Material imputado a la obra" description={`Coste neto: ${formatCurrency(total)} · salidas menos devoluciones aptas, a coste histórico`} />
        <Table className="mt-3" minWidth={720}>
          <THead><Th>Material</Th><Th align="right">Salidas</Th><Th align="right">Devuelto apto</Th><Th align="right">Devuelto dañado</Th><Th align="right">Coste neto</Th></THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.code}>
                <Td><span className="font-medium">{r.name}</span><p className="text-[12px] text-muted">{r.code}</p></Td>
                <Td align="right">{formatNumber(r.out)} {r.unit}</Td>
                <Td align="right" className="text-ink-2">{formatNumber(r.back)}</Td>
                <Td align="right" className="text-ink-2">{formatNumber(r.damaged)}</Td>
                <Td align="right" className="font-medium">{formatCurrency(r.cost)}</Td>
              </Tr>
            ))}
            {!rows.length && <EmptyRow cols={5}>Todavía no ha salido material para esta obra.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
      <Card>
        <CardHeader title="Documentos de almacén" />
        <ul className="mt-3 divide-y divide-line">
          {(docs ?? []).map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-6 py-2.5 text-[14px]">
              <Link className="font-medium text-brand-600" href={`/almacen/movimientos/${d.id}`}>{d.number}</Link>
              <Badge tone={INVENTORY_KIND[d.kind].tone}>{INVENTORY_KIND[d.kind].label}</Badge>
              {d.reversed_by_document_id && <Badge tone="danger">Anulado</Badge>}
              <span className="text-muted">{d.employee ? `${d.employee.first_name} ${d.employee.last_name}` : ""}</span>
              <span className="ml-auto text-muted">{formatDateTime(d.occurred_at)}</span>
            </li>
          ))}
          {!docs?.length && <li className="px-6 py-6 text-center text-[14px] text-muted">Sin movimientos.</li>}
        </ul>
      </Card>
    </div>
  );
}

async function Incidents({ id }: { id: string }) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("incidents").select("id, number, title, severity, status, created_at").eq("project_id", id).order("created_at", { ascending: false });
  return (
    <Card>
      <CardHeader title="Incidencias de la obra" />
      <ul className="mt-3 divide-y divide-line">
        {(data ?? []).map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-3 px-6 py-3 text-[14px]">
            <Link className="font-medium text-ink hover:text-brand-600" href={`/incidencias/${i.id}`}>{i.number} · {i.title}</Link>
            <Badge tone={SEVERITY[i.severity].tone}>{SEVERITY[i.severity].label}</Badge>
            <Badge tone={INCIDENT_STATUS[i.status].tone}>{INCIDENT_STATUS[i.status].label}</Badge>
            <span className="ml-auto text-muted">{formatDateTime(i.created_at)}</span>
          </li>
        ))}
        {!data?.length && <li className="px-6 py-8 text-center text-[14px] text-muted">Sin incidencias.</li>}
      </ul>
    </Card>
  );
}

async function WorkReports({ id }: { id: string }) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("work_reports")
    .select("id, number, report_date, status, work_done, employee:employees(first_name, last_name), lines:work_report_lines(hours), billing:work_report_billing(amount)")
    .eq("project_id", id)
    .order("report_date", { ascending: false });
  const rows = data ?? [];
  const hours = rows.reduce((s, r) => s + r.lines.reduce((a, l) => a + Number(l.hours ?? 0), 0), 0);
  const amount = rows.reduce((s, r) => s + Number(r.billing?.amount ?? 0), 0);
  return (
    <Card>
      <CardHeader
        title="Partes de trabajo"
        description={rows.length ? `${rows.length} partes · ${formatNumber(hours)} horas (informativo) · importes ${formatCurrency(amount)}` : "Los partes que hagan los trabajadores en esta obra aparecerán aquí."}
        action={<ButtonLink href={`/partes?obra=${id}`} variant="ghost" size="sm">Ver en Partes</ButtonLink>}
      />
      <Table className="mt-3" minWidth={720}>
        <THead><Th>Parte</Th><Th>Trabajador</Th><Th>Trabajo realizado</Th><Th className="text-right">Horas</Th><Th className="text-right">Importe</Th><Th>Estado</Th></THead>
        <TBody>
          {rows.map((r) => {
            const h = r.lines.reduce((a, l) => a + Number(l.hours ?? 0), 0);
            return (
              <Tr key={r.id}>
                <Td><Link className="font-medium text-ink hover:text-brand-600" href={`/partes/${r.id}`}>{r.number}</Link><p className="text-[12px] text-muted">{formatDate(r.report_date)}</p></Td>
                <Td className="text-ink-2">{r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : "Administración"}</Td>
                <Td className="max-w-xs truncate text-ink-2">{r.work_done ?? "—"}</Td>
                <Td className="tabular text-right">{h ? formatNumber(h) : "—"}</Td>
                <Td className="tabular text-right">{r.billing?.amount == null ? "—" : formatCurrency(Number(r.billing.amount))}</Td>
                <Td><Badge tone={WORK_REPORT_STATUS[r.status].tone}>{WORK_REPORT_STATUS[r.status].label}</Badge></Td>
              </Tr>
            );
          })}
          {!rows.length && <EmptyRow cols={6}>Sin partes de trabajo.</EmptyRow>}
        </TBody>
      </Table>
    </Card>
  );
}

async function History({ id }: { id: string }) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("project_status_history").select("id, from_status, to_status, changed_at, changed_by").eq("project_id", id).order("changed_at", { ascending: false });
  const ids = [...new Set((data ?? []).map((h) => h.changed_by).filter(Boolean))] as string[];
  const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  return (
    <Card>
      <CardHeader title="Historial de estados" description="Cada cambio queda registrado con fecha y usuario." />
      <ol className="mt-3 divide-y divide-line">
        {(data ?? []).map((h) => (
          <li key={h.id} className="flex flex-wrap items-center gap-2 px-6 py-3 text-[14px]">
            {h.from_status && <><Badge tone={PROJECT_STATUS[h.from_status].tone}>{PROJECT_STATUS[h.from_status].label}</Badge><span className="text-muted">→</span></>}
            <Badge tone={PROJECT_STATUS[h.to_status].tone}>{PROJECT_STATUS[h.to_status].label}</Badge>
            <span className="text-muted">{h.changed_by ? name.get(h.changed_by) ?? "" : "Sistema"}</span>
            <span className="ml-auto text-muted">{formatDateTime(h.changed_at)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
