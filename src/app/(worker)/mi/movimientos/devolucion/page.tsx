import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BackLink } from "@/components/ui/BackLink";
import { ReturnForm } from "@/features/inventory/components/forms";
import { activeProjectOptions } from "@/features/lookups";

export const metadata: Metadata = { title: "Devolver material" };

export default async function Page() {
  const { supabase } = await requireUser();
  const projects = await activeProjectOptions(supabase);
  return (
    <WorkerPage title="Devolver material" subtitle="Material sobrante que vuelve a la nave.">
      <BackLink href="/mi/movimientos">Movimientos</BackLink>
      <ReturnForm projects={projects} worker />
    </WorkerPage>
  );
}
