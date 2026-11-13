import type { Metadata } from "next";
import { ClipboardPlus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BigAction, ListRow, OkBanner, SectionTitle } from "@/components/layout/WorkerUi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WORK_REPORT_STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Partes de trabajo" };

export default async function Page(props: PageProps<"/mi/partes">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("work_reports")
    .select("id, number, report_date, status, site_name, project:projects(name)")
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);
  return (
    <WorkerPage title="Partes de trabajo" subtitle="Lo que has hecho cada día en obra">
      {sp.ok === "borrado" && <OkBanner>Borrador eliminado.</OkBanner>}
      <BigAction primary href="/mi/partes/nuevo" icon={<ClipboardPlus className="h-6 w-6" />} title="Nuevo parte" subtitle="Con firma del cliente en el móvil" />
      <section>
        <SectionTitle>Mis partes</SectionTitle>
        <Card className="divide-y divide-line">
          {(data ?? []).map((r) => (
            <ListRow
              key={r.id}
              href={`/mi/partes/${r.id}`}
              title={r.project?.name ?? r.site_name}
              subtitle={`${r.number} · ${formatDate(r.report_date)}`}
              right={<Badge tone={WORK_REPORT_STATUS[r.status].tone}>{WORK_REPORT_STATUS[r.status].label}</Badge>}
            />
          ))}
          {!data?.length && <p className="px-4 py-6 text-center text-[14px] text-muted">Todavía no has hecho partes.</p>}
        </Card>
      </section>
    </WorkerPage>
  );
}
