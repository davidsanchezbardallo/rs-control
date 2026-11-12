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
import { projectProfit } from "@/features/projects/finance";
import { ACTIVE_PROJECT_STATUSES, PROJECT_STATUS, options } from "@/lib/labels";
import { ilikeAny } from "@/lib/utils/search";
import { formatCurrencyRounded, formatDate, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Obras" };

export default async function Page(props: PageProps<"/obras">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const { from, to } = pageRange(page);
  let q = supabase.from("projects").select("id, code, name, status, city, start_date, planned_end_date, client:clients(name)", { count: "exact" }).order("code", { ascending: false });
  if (sp.q) q = q.or(ilikeAny(["code", "name", "city", "address"], sp.q));
  if (!sp.estado || sp.estado === "activas") q = q.in("status", ACTIVE_PROJECT_STATUSES);
  else if (sp.estado !== "todas") q = q.eq("status", sp.estado as never);
  const { data, count } = await q.range(from, to);
  const ids = (data ?? []).map((p) => p.id);
  const { data: fin } = await supabase.from("v_project_financials").select("*").in("project_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const byId = new Map((fin ?? []).map((f) => [f.project_id, projectProfit(f)]));

  return (
    <div className="space-y-6">
      <PageHeader title="Obras y proyectos" description="Fichas de obra con su equipo, documentación y rentabilidad real." actions={<ButtonLink href="/obras/nueva" icon={<Plus className="h-4 w-4" />}>Nueva obra</ButtonLink>} />
      <Card className="overflow-hidden">
        <FilterBar action="/obras" q={sp.q} placeholder="Código, nombre o localidad">
          <FilterSelect name="estado" label="Estado" value={sp.estado ?? "activas"} options={[{ value: "activas", label: "Activas" }, { value: "todas", label: "Todas" }, ...options(PROJECT_STATUS)]} />
        </FilterBar>
        <Table minWidth={900}>
          <THead>
            <Th>Obra</Th>
            <Th>Cliente</Th>
            <Th>Estado</Th>
            <Th>Plazo</Th>
            <Th align="right">Presupuesto</Th>
            <Th align="right">Coste real</Th>
            <Th align="right">Margen</Th>
          </THead>
          <TBody>
            {(data ?? []).map((p) => {
              const f = byId.get(p.id);
              return (
                <Tr key={p.id}>
                  <Td>
                    <Link href={`/obras/${p.id}`} className="font-medium text-ink hover:text-brand-600">{p.name}</Link>
                    <p className="text-[12px] text-muted">{p.code}{p.city ? ` · ${p.city}` : ""}</p>
                  </Td>
                  <Td className="text-ink-2">{p.client?.name ?? "—"}</Td>
                  <Td><Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge></Td>
                  <Td className="whitespace-nowrap text-ink-2">{p.start_date ? formatDate(p.start_date) : "—"} → {p.planned_end_date ? formatDate(p.planned_end_date) : "—"}</Td>
                  <Td align="right">{f ? formatCurrencyRounded(f.plannedIncome) : "—"}</Td>
                  <Td align="right" className="text-ink-2">{f ? formatCurrencyRounded(f.realCost) : "—"}</Td>
                  <Td align="right" className={cn("font-medium", f?.marginPct !== null && f?.marginPct !== undefined && f.marginPct < 0.1 ? "text-warning" : "")}>{f?.marginPct === null || !f ? "—" : formatPercent(f.marginPct)}</Td>
                </Tr>
              );
            })}
            {!data?.length && <EmptyRow cols={7}>No hay obras con esos filtros.</EmptyRow>}
          </TBody>
        </Table>
        <Pagination page={page} total={count ?? 0} params={sp} basePath="/obras" />
      </Card>
    </div>
  );
}
