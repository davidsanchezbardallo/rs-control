import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { IncidentForm } from "@/features/worker/components/forms";
import { activeProjectOptions, vehicleOptions } from "@/features/lookups";

export const metadata: Metadata = { title: "Registrar incidencia" };

export default async function Page() {
  const { supabase, profile } = await requireAdmin();
  const [projects, vehicles] = await Promise.all([activeProjectOptions(supabase), vehicleOptions(supabase)]);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/incidencias">Incidencias</BackLink>
      <PageHeader title="Registrar incidencia" />
      <IncidentForm projects={projects} vehicles={vehicles} userId={profile.id} />
    </div>
  );
}
