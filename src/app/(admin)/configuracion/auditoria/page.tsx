import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, FilterSelect } from "@/components/ui/FilterBar";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { SettingsTabs } from "@/features/settings/SettingsTabs";
import { formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Auditoría" };
const TABLES: Record<string, string> = { projects: "Obras", materials: "Materiales", material_requests: "Solicitudes", employees: "Trabajadores", invoices: "Facturas", financial_transactions: "Movimientos bancarios", loans: "Financiación", profiles: "Usuarios", documents: "Documentos", project_budget_items: "Presupuestos", project_expenses: "Gastos de obra", project_assignments: "Asignaciones" };
const ACTION: Record<string, { label: string; tone: "success" | "brand" | "danger" }> = { insert: { label: "Alta", tone: "success" }, update: { label: "Cambio", tone: "brand" }, delete: { label: "Baja", tone: "danger" } };

export default async function Page(props: PageProps<"/configuracion/auditoria">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("audit_recent", { p_limit: 200, p_table: sp.tabla });
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Registro inmutable de quién cambió qué y cuándo. Los datos sensibles aparecen enmascarados." />
      <SettingsTabs active="/configuracion/auditoria" />
      <Card className="overflow-hidden">
        <FilterBar action="/configuracion/auditoria" placeholder="(búsqueda no disponible)">
          <FilterSelect name="tabla" label="Área" value={sp.tabla} options={Object.entries(TABLES).map(([value, label]) => ({ value, label }))} />
        </FilterBar>
        <Table minWidth={900}>
          <THead><Th>Fecha</Th><Th>Usuario</Th><Th>Área</Th><Th>Acción</Th><Th>Cambios</Th></THead>
          <TBody>
            {(data ?? []).map((a, i) => (
              <Tr key={i}>
                <Td className="whitespace-nowrap text-ink-2">{formatDateTime(a.occurred_at)}</Td>
                <Td>{a.actor}</Td>
                <Td>{TABLES[a.table_name] ?? a.table_name}</Td>
                <Td><Badge tone={ACTION[a.action]?.tone}>{ACTION[a.action]?.label ?? a.action}</Badge></Td>
                <Td className="max-w-[420px]"><code className="line-clamp-2 text-[12px] break-all text-muted">{a.changes ? JSON.stringify(a.changes) : ""}</code></Td>
              </Tr>
            ))}
            {!data?.length && <EmptyRow cols={5}>Sin registros.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
