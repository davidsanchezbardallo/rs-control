import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { VehicleForm } from "@/features/fleet/components/forms";

export const metadata: Metadata = { title: "Nuevo vehículo" };

export default async function Page() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <BackLink href="/vehiculos">Vehículos</BackLink>
      <PageHeader title="Nuevo vehículo" />
      <Card className="p-5 sm:p-6"><VehicleForm /></Card>
    </div>
  );
}
