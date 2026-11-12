import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BackLink } from "@/components/ui/BackLink";
import { WorkerIssueForm } from "@/features/worker/components/forms";
import { activeProjectOptions } from "@/features/lookups";
import { getMyContext } from "@/features/worker/queries";

export const metadata: Metadata = { title: "Retirar material" };

export default async function Page() {
  const { supabase } = await requireUser();
  const [projects, ctx] = await Promise.all([activeProjectOptions(supabase), getMyContext(supabase)]);
  return (
    <WorkerPage title="Retirar material" subtitle="Registra el material que te llevas de la nave. Se descuenta del stock al momento.">
      <BackLink href="/mi/movimientos">Movimientos</BackLink>
      <WorkerIssueForm projects={projects} defaultProject={ctx.projects[0]?.id} />
    </WorkerPage>
  );
}
