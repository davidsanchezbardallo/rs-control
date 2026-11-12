import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BackLink } from "@/components/ui/BackLink";
import { RequestForm } from "@/features/worker/components/forms";
import { activeProjectOptions } from "@/features/lookups";
import { getMyContext } from "@/features/worker/queries";

export const metadata: Metadata = { title: "Solicitar material" };

export default async function Page() {
  const { supabase } = await requireUser();
  const [projects, ctx] = await Promise.all([activeProjectOptions(supabase), getMyContext(supabase)]);
  return (
    <WorkerPage title="Solicitar material" subtitle="Administración la revisará y te avisará cuando esté preparada.">
      <BackLink href="/mi/material">Material</BackLink>
      <RequestForm projects={projects} defaultProject={ctx.projects[0]?.id} />
    </WorkerPage>
  );
}
