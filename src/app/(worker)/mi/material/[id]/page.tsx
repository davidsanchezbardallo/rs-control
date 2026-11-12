import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/layout/WorkerUi";
import { CancelRequestButton } from "@/features/inventory/components/RequestActions";
import { PRIORITY, REQUEST_STATUS } from "@/lib/labels";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Solicitud" };

export default async function Page(props: PageProps<"/mi/material/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireUser();
  const { data: r } = await supabase
    .from("material_requests")
    .select("id, number, status, status_reason, priority, notes, created_at, project:projects(name), items:material_request_items(id, free_text, quantity, delivered_quantity, material:materials(name, code, unit:units(code)))")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound(); // RLS: solo existe para él si es suya
  const st = REQUEST_STATUS[r.status];
  return (
    <WorkerPage title={r.number} subtitle={`${r.project?.name} · ${formatDateTime(r.created_at)}`}>
      <BackLink href="/mi/material">Material</BackLink>
      <div className="flex flex-wrap gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        <Badge tone={PRIORITY[r.priority].tone}>Prioridad {PRIORITY[r.priority].label.toLowerCase()}</Badge>
      </div>
      {r.status_reason && <p className="rounded-[var(--radius-lg)] bg-surface px-4 py-3 text-[14px] text-ink-2">Administración: «{r.status_reason}»</p>}
      <Card className="divide-y divide-line">
        {r.items.map((i) => (
          <ListRow
            key={i.id}
            title={i.material?.name ?? i.free_text}
            subtitle={i.material ? i.material.code : "No catalogado"}
            right={
              <span className="tabular text-right text-[14px] text-ink">
                {formatNumber(Number(i.quantity))} {i.material?.unit?.code}
                {Number(i.delivered_quantity) > 0 && <span className="block text-[12px] text-success">Entregado {formatNumber(Number(i.delivered_quantity))}</span>}
              </span>
            }
          />
        ))}
      </Card>
      {r.notes && <p className="px-1 text-[14px] text-muted">Tus observaciones: «{r.notes}»</p>}
      {r.status === "pending" && <CancelRequestButton requestId={r.id} />}
    </WorkerPage>
  );
}
