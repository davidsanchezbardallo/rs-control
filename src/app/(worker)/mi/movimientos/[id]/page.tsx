import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/layout/WorkerUi";
import { ConfirmReceptionButton } from "@/features/worker/components/forms";
import { INVENTORY_KIND, MOVEMENT_TYPE } from "@/lib/labels";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Movimiento" };

export default async function Page(props: PageProps<"/mi/movimientos/[id]">) {
  const { id } = await props.params;
  const { supabase, profile } = await requireUser();
  const { data: d } = await supabase.from("inventory_documents").select("id, number, kind, occurred_at, notes, created_by, received_confirmed_at, reversed_by_document_id, project:projects(name)").eq("id", id).maybeSingle();
  if (!d) notFound();
  const { data: lines } = await supabase.rpc("document_lines", { p_document: id });
  const needsConfirm = d.kind === "issue" && !d.received_confirmed_at && d.created_by !== profile.id && !d.reversed_by_document_id;
  return (
    <WorkerPage title={INVENTORY_KIND[d.kind].label} subtitle={`${d.number} · ${d.project?.name ?? ""} · ${formatDateTime(d.occurred_at)}`}>
      <BackLink href="/mi/movimientos">Movimientos</BackLink>
      {d.reversed_by_document_id && <Badge tone="danger">Anulado por administración</Badge>}
      {d.received_confirmed_at && <Badge tone="success">Recepción confirmada {formatDateTime(d.received_confirmed_at)}</Badge>}
      <Card className="divide-y divide-line">
        {(lines ?? []).map((l, i) => (
          <ListRow key={i} title={l.name} subtitle={`${l.code} · ${MOVEMENT_TYPE[l.movement_type].label}`} right={<span className="tabular text-[15px] font-medium text-ink">{formatNumber(Number(l.quantity))} {l.unit_code}</span>} />
        ))}
      </Card>
      {d.notes && <p className="px-1 text-[14px] text-muted">«{d.notes}»</p>}
      {needsConfirm && <ConfirmReceptionButton documentId={d.id} />}
    </WorkerPage>
  );
}
