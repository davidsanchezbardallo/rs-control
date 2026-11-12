import type { Metadata } from "next";
import { ArrowUpFromLine, Undo2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BigAction, ListRow, OkBanner, SectionTitle } from "@/components/layout/WorkerUi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { INVENTORY_KIND } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Movimientos" };

export default async function Page(props: PageProps<"/mi/movimientos">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireUser();
  const { data: docs } = await supabase
    .from("inventory_documents")
    .select("id, number, kind, occurred_at, received_confirmed_at, reversed_by_document_id, project:projects(name)")
    .order("occurred_at", { ascending: false })
    .limit(50);
  return (
    <WorkerPage title="Movimientos" subtitle="Salidas de material de la nave y devoluciones">
      {sp.ok === "salida" && <OkBanner>Salida registrada. El stock ya está actualizado.</OkBanner>}
      {sp.ok === "devolucion" && <OkBanner>Devolución registrada. ¡Gracias!</OkBanner>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BigAction primary href="/mi/movimientos/salida" icon={<ArrowUpFromLine className="h-6 w-6" />} title="Retirar material" subtitle="Me llevo material de la nave" />
        <BigAction href="/mi/movimientos/devolucion" icon={<Undo2 className="h-6 w-6" />} title="Devolver material" subtitle="Traigo material sobrante" />
      </div>
      <section>
        <SectionTitle>Mi historial</SectionTitle>
        <Card className="divide-y divide-line">
          {(docs ?? []).map((d) => (
            <ListRow
              key={d.id}
              href={`/mi/movimientos/${d.id}`}
              title={`${INVENTORY_KIND[d.kind].label} · ${d.project?.name ?? ""}`}
              subtitle={`${d.number} · ${formatDateTime(d.occurred_at)}`}
              right={d.reversed_by_document_id ? <Badge tone="danger">Anulado</Badge> : d.kind === "issue" && !d.received_confirmed_at ? <Badge tone="warning">Sin confirmar</Badge> : undefined}
            />
          ))}
          {!docs?.length && <p className="px-4 py-6 text-center text-[14px] text-muted">Aún no tienes movimientos.</p>}
        </Card>
      </section>
    </WorkerPage>
  );
}
