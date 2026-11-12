import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BackLink } from "@/components/ui/BackLink";
import { IncidentForm } from "@/features/worker/components/forms";
import { activeProjectOptions, vehicleOptions } from "@/features/lookups";
import { getMyContext } from "@/features/worker/queries";

export const metadata: Metadata = { title: "Comunicar incidencia" };

export default async function Page() {
  const { supabase, profile } = await requireUser();
  const [projects, vehicles, ctx] = await Promise.all([activeProjectOptions(supabase), vehicleOptions(supabase), getMyContext(supabase)]);
  return (
    <WorkerPage title="Comunicar incidencia">
      <BackLink href="/mi/incidencias">Incidencias</BackLink>
      <IncidentForm projects={projects} vehicles={vehicles} userId={profile.id} defaultProject={ctx.projects[0]?.id} />
    </WorkerPage>
  );
}
