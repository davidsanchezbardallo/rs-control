import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { PurchaseForm } from "@/features/inventory/components/forms";
import { supplierOptions, todayISO } from "@/features/lookups";

export const metadata: Metadata = { title: "Entrada de material" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const suppliers = await supplierOptions(supabase);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/almacen">Almacén</BackLink>
      <PageHeader title="Entrada de material" description="Registra material comprado o recibido. Al confirmar, aumenta el stock y se recalcula el precio medio." />
      <PurchaseForm suppliers={suppliers} today={todayISO()} />
    </div>
  );
}
