import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { EmployeeForm } from "@/features/employees/components/forms";

export const metadata: Metadata = { title: "Nuevo trabajador" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("labor_cost_categories").select("id, name, hourly_cost").eq("is_active", true).order("name");
  const cats = (data ?? []).map((c) => ({ value: c.id, label: c.name }));
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/trabajadores">Trabajadores</BackLink>
      <PageHeader title="Nuevo trabajador" description="Después podrás crear su acceso a la app y añadir documentación." />
      <Card className="p-5 sm:p-6"><EmployeeForm costCategories={cats} /></Card>
    </div>
  );
}
