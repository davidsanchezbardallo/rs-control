import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { WorkReportForm } from "@/features/work-reports/components/WorkReportForm";
import { projectOptions, todayISO } from "@/features/lookups";

export const metadata: Metadata = { title: "Nuevo parte" };

export default async function Page() {
  const { supabase, profile } = await requireAdmin();
  const projects = await projectOptions(supabase);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/partes">Partes de trabajo</BackLink>
      <PageHeader title="Nuevo parte" description="Parte técnico registrado por administración." />
      <WorkReportForm projects={projects} userId={profile.id} myName={profile.fullName} today={todayISO()} mode="admin" />
    </div>
  );
}
