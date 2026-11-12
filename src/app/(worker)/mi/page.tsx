import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowUpFromLine, HardHat, PackagePlus, Truck, Undo2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { BigAction, ListRow, OkBanner, SectionTitle } from "@/components/layout/WorkerUi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmReceptionButton } from "@/features/worker/components/forms";
import { getMyContext, getPendingReceptions } from "@/features/worker/queries";
import { REQUEST_STATUS } from "@/lib/labels";
import { formatDate, formatDateTime, plural } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Inicio" };

export default async function WorkerHome(props: PageProps<"/mi">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase, profile } = await requireUser();
  const [ctx, receptions, { data: requests }] = await Promise.all([
    getMyContext(supabase),
    getPendingReceptions(supabase, profile.employeeId!, profile.id),
    supabase.from("material_requests").select("id, number, status, created_at, project:projects(name), items:material_request_items(id)").order("created_at", { ascending: false }).limit(4),
  ]);
  const hour = Number(new Intl.DateTimeFormat("es-ES", { hour: "numeric", timeZone: "Europe/Madrid" }).format(new Date()));
  const hello = hour < 14 ? "Buenos días" : hour < 21 ? "Buenas tardes" : "Buenas noches";

  return (
    <WorkerPage title={`${hello}, ${ctx.employee?.first_name ?? profile.fullName.split(" ")[0]}`} subtitle={formatDate(new Date())}>
      {sp.ok === "recepcion" && <OkBanner>Recepción confirmada. ¡Gracias!</OkBanner>}
      {/* Dónde estoy hoy */}
      <Link href="/mi/perfil" className="block">
        <Card className="divide-y divide-line">
          <div className="flex items-center gap-3 p-4">
            <HardHat className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted">Mi obra</p>
              <p className="truncate text-[15px] font-medium text-ink">{ctx.projects.length ? ctx.projects.map((p) => p.name).join(" · ") : "Toca para indicar tu obra"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Truck className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted">Mi vehículo</p>
              <p className="truncate text-[15px] font-medium text-ink">{ctx.vehicle ? `${ctx.vehicle.plate} · ${[ctx.vehicle.brand, ctx.vehicle.model].filter(Boolean).join(" ")}` : "Sin vehículo · toca para indicarlo"}</p>
            </div>
          </div>
        </Card>
      </Link>

      {/* Recepciones pendientes */}
      {receptions.length > 0 && (
        <section aria-labelledby="recep" className="space-y-3">
          <SectionTitle><span id="recep">Material entregado · confirma la recepción</span></SectionTitle>
          {receptions.map((r) => (
            <Card key={r.id} className="space-y-3 p-4 ring-2 ring-warning/30">
              <Link href={`/mi/movimientos/${r.id}`} className="block">
                <p className="text-[15px] font-semibold text-ink">{r.number}{r.request ? ` · solicitud ${r.request.number}` : ""}</p>
                <p className="text-[13px] text-muted">{r.project?.name} · {formatDateTime(r.occurred_at)} · ver detalle</p>
              </Link>
              <ConfirmReceptionButton documentId={r.id} />
            </Card>
          ))}
        </section>
      )}

      <div className="space-y-3">
        <BigAction primary href="/mi/material/solicitar" icon={<PackagePlus className="h-6 w-6" />} title="Solicitar material" subtitle="Pide material a la nave para tu obra" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BigAction href="/mi/movimientos/salida" icon={<ArrowUpFromLine className="h-6 w-6" />} title="Retirar material" subtitle="Salida de la nave" />
          <BigAction href="/mi/movimientos/devolucion" icon={<Undo2 className="h-6 w-6" />} title="Devolver material" subtitle="Entrada a la nave" />
        </div>
        <BigAction href="/mi/incidencias/nueva" icon={<AlertTriangle className="h-6 w-6" />} title="Comunicar incidencia" subtitle="Problemas en obra o con el vehículo" />
      </div>

      <section>
        <SectionTitle action={<Link href="/mi/material" className="text-[13px] font-medium text-brand-600">Ver todas</Link>}>Mis solicitudes</SectionTitle>
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
