import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { MaterialForm } from "@/features/inventory/components/forms";
import { categoryOptions, supplierOptions, unitOptions } from "@/features/lookups";

export const metadata: Metadata = { title: "Nuevo material" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const [categories, units, suppliers] = await Promise.all([categoryOptions(supabase), unitOptions(supabase), supplierOptions(supabase)]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/almacen">Almacén</BackLink>
      <PageHeader title="Nuevo material" description="Alta en el catálogo. El stock inicial se registra después con una entrada." />
      <Card className="p-5 sm:p-6">
        <MaterialForm categories={categories} units={units} suppliers={suppliers} />
      </Card>
    </div>
  );
}
