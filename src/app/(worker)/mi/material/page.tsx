import type { Metadata } from "next";
import { PackagePlus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BigAction, ListRow, OkBanner, SectionTitle } from "@/components/layout/WorkerUi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmReceptionButton } from "@/features/worker/components/forms";
import { getPendingReceptions } from "@/features/worker/queries";
import { REQUEST_STATUS } from "@/lib/labels";
import { formatDate, formatDateTime, plural } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Material" };

export default async function Page(props: PageProps<"/mi/material">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase, profile } = await requireUser();
  const [receptions, { data: requests }] = await Promise.all([
    getPendingReceptions(supabase, profile.employeeId!, profile.id),
    supabase.from("material_requests").select("id, number, status, created_at, project:projects(name), items:material_request_items(id)").order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <WorkerPage title="Material" subtitle="Solicitudes y recepciones">
      {sp.ok && <OkBanner>Solicitud enviada. Administración ya la ha recibido.</OkBanner>}
      <BigAction primary href="/mi/material/solicitar" icon={<PackagePlus className="h-6 w-6" />} title="Nueva solicitud" subtitle="Elige obra, materiales y cantidades" />
      {receptions.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>Pendiente de confirmar</SectionTitle>
          {receptions.map((r) => (
            <Card key={r.id} className="space-y-3 p-4">
              <p className="text-[15px] font-semibold text-ink">{r.number} · {r.project?.name}</p>
              <p className="text-[13px] text-muted">Entregado {formatDateTime(r.occurred_at)}</p>
              <ConfirmReceptionButton documentId={r.id} />
            </Card>
          ))}
        </section>
      )}
      <section>
        <SectionTitle>Mis solicitudes</SectionTitle>
        <Card className="divide-y divide-line">
          {(requests ?? []).map((r) => (
            <ListRow key={r.id} href={`/mi/material/${r.id}`} title={r.project?.name} subtitle={`${r.number} · ${plural(r.items.length, "artículo", "artículos")} · ${formatDate(r.created_at)}`} right={<Badge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</Badge>} />
          ))}
          {!requests?.length && <p className="px-4 py-6 text-center text-[14px] text-muted">Todavía no has hecho solicitudes.</p>}
        </Card>
      </section>
    </WorkerPage>
  );
}
