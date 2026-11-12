import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { AdjustmentForm } from "@/features/inventory/components/forms";

export const metadata: Metadata = { title: "Ajuste de inventario" };

export default async function Page(props: PageProps<"/almacen/ajuste">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("materials").select("id, code, name").eq("status", "active").order("name");
  const materials = (data ?? []).map((m) => ({ value: m.id, label: `${m.name} (${m.code})` }));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/almacen">Almacén</BackLink>
      <PageHeader title="Ajuste de inventario" description="Para pérdidas, roturas, material defectuoso, diferencias de recuento o errores. Nunca se borra un movimiento: el ajuste queda en el historial." />
      <AdjustmentForm materials={materials} defaultMaterial={sp.material} />
    </div>
  );
}
