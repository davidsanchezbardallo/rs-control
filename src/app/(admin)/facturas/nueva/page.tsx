import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { InvoiceForm } from "@/features/finance/components/forms";
import { clientOptions, projectOptions, supplierOptions, todayISO } from "@/features/lookups";

export const metadata: Metadata = { title: "Registrar factura" };

export default async function Page(props: PageProps<"/facturas/nueva">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const [clients, suppliers, projects] = await Promise.all([clientOptions(supabase), supplierOptions(supabase), projectOptions(supabase)]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/facturas">Facturas</BackLink>
      <PageHeader title="Registrar factura" description="Las facturas se emiten en Contasimple; aquí se registran para controlar cobros, pagos y la rentabilidad de cada obra. Después podrás adjuntar el PDF." />
      <Card className="p-5 sm:p-6"><InvoiceForm clients={clients} suppliers={suppliers} projects={projects} defaults={{ today: todayISO(), project_id: sp.obra, direction: sp.tipo }} /></Card>
    </div>
  );
}
