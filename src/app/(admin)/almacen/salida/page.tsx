import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { IssueForm } from "@/features/inventory/components/forms";
import { activeProjectOptions, employeeOptions } from "@/features/lookups";

export const metadata: Metadata = { title: "Salida de material" };

export default async function Page(props: PageProps<"/almacen/salida">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const [projects, employees] = await Promise.all([activeProjectOptions(supabase), employeeOptions(supabase)]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/almacen">Almacén</BackLink>
      <PageHeader title="Salida de material a obra" description="Descuenta el stock de la nave y carga el coste del material a la obra. Se comprueba la disponibilidad real." />
      <IssueForm projects={projects} employees={employees} defaults={{ project_id: sp.obra }} />
    </div>
  );
}
