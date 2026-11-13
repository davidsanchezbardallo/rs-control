import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterDate, FilterSelect } from "@/components/ui/FilterBar";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { Pagination, pageRange } from "@/components/ui/Pagination";
import { employeeOptions, projectOptions } from "@/features/lookups";
import { WORK_REPORT_STATUS, WORK_TYPE, options } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Partes de trabajo" };

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isId = (v?: string) => !!v && /^[0-9a-f-]{36}$/.test(v);

export default async function Page(props: PageProps<"/partes">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const { from, to } = pageRange(page);
  let q = supabase
    .from("work_reports")
    .select("id, number, report_date, status, work_types, site_name, project:projects(id, code, name), employee:employees(first_name, last_name), billing:work_report_billing(amount)", { count: "exact" })
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (sp.estado && sp.estado in WORK_REPORT_STATUS) q = q.eq("status", sp.estado as never);
  if (isId(sp.obra)) q = q.eq("project_id", sp.obra!);
  if (isId(sp.trabajador)) q = q.eq("employee_id", sp.trabajador!);
  if (isDate(sp.desde)) q = q.gte("report_date", sp.desde!);
  if (isDate(sp.hasta)) q = q.lte("report_date", sp.hasta!);
  if (sp.q) {
    const t = sp.q.replace(/[%,()*.:]/g, "");
    q = q.or(`number.ilike.%${t}%,site_name.ilike.%${t}%,client_name.ilike.%${t}%,work_done.ilike.%${t}%`);
  }
  const [{ data, count }, projects, employees, { count: pending }] = await Promise.all([
    q.range(from, to),
    projectOptions(supabase),
    employeeOptions(supabase, false),
    supabase.from("work_reports").select("id", { count: "exact", head: true }).eq("status", "submitted"),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Partes de trabajo"
        description={pending ? `${pending} pendientes de validar.` : "Partes técnicos enviados por los trabajadores desde obra."}
        actions={<ButtonLink href="/partes/nuevo" variant="secondary" icon={<Plus className="h-4 w-4" />}>Nuevo parte</ButtonLink>}
      />
      <Card className="overflow-hidden">
        <FilterBar action="/partes" q={sp.q} placeholder="Número, cliente o trabajo">
          <FilterSelect name="estado" label="Estado" value={sp.estado} options={options(WORK_REPORT_STATUS)} />
          <FilterSelect name="obra" label="Obra" value={sp.obra} options={projects} />
          <FilterSelect name="trabajador" label="Trabajador" value={sp.trabajador} options={employees} />
          <FilterDate name="desde" label="Desde" value={sp.desde} />
          <FilterDate name="hasta" label="Hasta" value={sp.hasta} />
        </FilterBar>
        <Table minWidth={900}>
          <THead><Th>Parte</Th><Th>Obra</Th><Th>Trabajador</Th><Th>Tipo</Th><Th className="text-right">Importe</Th><Th>Estado</Th><Th><span className="sr-only">PDF</span></Th></THead>
          <TBody>
            {(data ?? []).map((r) => {
              const amount = r.billing?.amount;
              return (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/partes/${r.id}`} className="font-medium text-ink hover:text-brand-600">{r.number}</Link>
                    <p className="text-[12px] text-muted">{formatDate(r.report_date)}</p>
                  </Td>
                  <Td className="text-ink-2">{r.project ? <Link href={`/obras/${r.project.id}`} className="hover:text-brand-600">{r.project.code} · {r.project.name}</Link> : r.site_name ?? "—"}</Td>
                  <Td className="text-ink-2">{r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : "Administración"}</Td>
                  <Td className="text-ink-2">{r.work_types.map((t) => WORK_TYPE[t]).join(", ") || "—"}</Td>
                  <Td className="text-right tabular-nums text-ink-2">{amount == null ? "—" : formatCurrency(Number(amount))}</Td>
                  <Td><Badge tone={WORK_REPORT_STATUS[r.status].tone}>{WORK_REPORT_STATUS[r.status].label}</Badge></Td>
                  <Td><a href={`/api/partes/${r.id}/pdf`} aria-label={`Descargar ${r.number} en PDF`} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface hover:text-brand-600"><Download className="h-4 w-4" /></a></Td>
                </Tr>
              );
            })}
            {!data?.length && <EmptyRow cols={7}>No hay partes con ese filtro.</EmptyRow>}
          </TBody>
        </Table>
        <Pagination page={page} total={count ?? 0} params={sp} basePath="/partes" />
      </Card>
    </div>
  );
}
