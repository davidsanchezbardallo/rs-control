import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { ReturnForm } from "@/features/inventory/components/forms";
import { employeeOptions, projectOptions } from "@/features/lookups";

export const metadata: Metadata = { title: "Devolución de material" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const [projects, employees] = await Promise.all([projectOptions(supabase), employeeOptions(supabase)]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/almacen/movimientos">Movimientos</BackLink>
      <PageHeader title="Devolución de material" description="Material sobrante que vuelve de obra a la nave. Se abona a la obra al mismo coste con que se cargó." />
      <ReturnForm projects={projects} employees={employees} />
    </div>
  );
}
