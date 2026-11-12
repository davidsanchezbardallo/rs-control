import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { DocumentsCard } from "@/features/documents/components/DocumentsCard";
import { InvoiceTabs } from "@/features/finance/components/InvoiceTabs";

export const metadata: Metadata = { title: "Documentación de empresa" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Facturas y documentación" description="Repositorio de documentación general: contratos, seguros, certificados de empresa… Los documentos de obras, trabajadores y vehículos están en su propia ficha." />
      <InvoiceTabs active="/facturas/documentos" />
      <DocumentsCard supabase={supabase} entity="company" title="Documentación de empresa" defaultCategory="company" />
    </div>
  );
}
