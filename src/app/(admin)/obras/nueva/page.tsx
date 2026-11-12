import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { ProjectForm } from "@/features/projects/components/forms";
import { clientOptions, employeeOptions } from "@/features/lookups";

export const metadata: Metadata = { title: "Nueva obra" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const [clients, employees] = await Promise.all([clientOptions(supabase), employeeOptions(supabase)]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/obras">Obras</BackLink>
      <PageHeader title="Nueva obra" description="Después podrás añadir presupuesto, costes previstos, equipo y documentación." />
      <Card className="p-5 sm:p-6"><ProjectForm clients={clients} employees={employees} /></Card>
    </div>
  );
}
