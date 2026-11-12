import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SettingsTabs } from "@/features/settings/SettingsTabs";
import { CatalogDialog } from "@/features/settings/forms";
import { formatCurrency } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Catálogos" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const [{ data: cats }, { data: units }, { data: costs }] = await Promise.all([
    supabase.from("material_categories").select("*").order("sort_order"),
    supabase.from("units").select("*").order("name"),
    supabase.from("labor_cost_categories").select("*").order("name"),
  ]);
  const Row = ({ children, action }: { children: React.ReactNode; action: React.ReactNode }) => (
    <li className="flex items-center gap-3 px-6 py-2.5 text-[14px]"><div className="flex-1">{children}</div>{action}</li>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Categorías de material, unidades de medida y costes horarios por categoría profesional." />
      <SettingsTabs active="/configuracion/catalogos" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card><CardHeader title="Categorías de material" action={<CatalogDialog kind="category" />} /><ul className="mt-3 divide-y divide-line">{(cats ?? []).map((c) => <Row key={c.id} action={<CatalogDialog kind="category" item={c} />}>{c.name}</Row>)}</ul></Card>
        <Card><CardHeader title="Unidades de medida" action={<CatalogDialog kind="unit" />} /><ul className="mt-3 divide-y divide-line">{(units ?? []).map((u) => <Row key={u.id} action={<CatalogDialog kind="unit" item={u} />}>{u.name} <span className="font-mono text-muted">({u.code})</span>{u.allows_decimals && <Badge className="ml-2">Decimales</Badge>}</Row>)}</ul></Card>
        <Card><CardHeader title="Costes horarios" action={<CatalogDialog kind="cost" />} /><ul className="mt-3 divide-y divide-line">{(costs ?? []).map((c) => <Row key={c.id} action={<CatalogDialog kind="cost" item={c} />}><span className={c.is_active ? "" : "text-muted line-through"}>{c.name}</span> <span className="tabular text-muted">· {formatCurrency(Number(c.hourly_cost))}/h</span></Row>)}</ul></Card>
      </div>
    </div>
  );
}
