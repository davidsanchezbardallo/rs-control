import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BigAction, ListRow, OkBanner, SectionTitle } from "@/components/layout/WorkerUi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { INCIDENT_STATUS } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Incidencias" };

export default async function Page(props: PageProps<"/mi/incidencias">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("incidents").select("id, number, title, status, resolution, created_at, project:projects(name), vehicle:vehicles(plate)").order("created_at", { ascending: false }).limit(50);
  return (
    <WorkerPage title="Incidencias" subtitle="Comunica cualquier problema en obra o con el vehículo">
      {sp.ok && <OkBanner>Incidencia enviada. Administración ha recibido el aviso.</OkBanner>}
      <BigAction primary href="/mi/incidencias/nueva" icon={<AlertTriangle className="h-6 w-6" />} title="Comunicar incidencia" subtitle="Con fotos si lo necesitas" />
      <section>
        <SectionTitle>Mis incidencias</SectionTitle>
        <Card className="divide-y divide-line">
          {(data ?? []).map((i) => (
            <ListRow
              key={i.id}
              title={i.title}
              subtitle={`${i.number} · ${i.project?.name ?? (i.vehicle ? `Vehículo ${i.vehicle.plate}` : "")} · ${formatDateTime(i.created_at)}${i.resolution ? ` · ${i.resolution}` : ""}`}
              right={<Badge tone={INCIDENT_STATUS[i.status].tone}>{INCIDENT_STATUS[i.status].label}</Badge>}
            />
          ))}
          {!data?.length && <p className="px-4 py-6 text-center text-[14px] text-muted">No has comunicado incidencias.</p>}
        </Card>
      </section>
    </WorkerPage>
  );
}
