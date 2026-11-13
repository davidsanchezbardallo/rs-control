import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BackLink } from "@/components/ui/BackLink";
import { WorkReportForm } from "@/features/work-reports/components/WorkReportForm";
import { activeProjectOptions, todayISO } from "@/features/lookups";

export const metadata: Metadata = { title: "Nuevo parte" };

export default async function Page() {
  const { supabase, profile } = await requireUser();
  const projects = await activeProjectOptions(supabase);
  return (
    <WorkerPage title="Nuevo parte" subtitle="Parte técnico de trabajo">
      <BackLink href="/mi/partes">Partes</BackLink>
      <WorkReportForm projects={projects} userId={profile.id} myName={profile.fullName} today={todayISO()} mode="worker" />
    </WorkerPage>
  );
}
