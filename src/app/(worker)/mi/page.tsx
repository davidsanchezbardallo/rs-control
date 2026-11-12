import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronRight, MapPin, PackageCheck, PackagePlus, Wrench } from "lucide-react";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { demoWorkerRequests, demoWorkerToday, demoWorkerUser } from "@/lib/demo/data";
import { REQUEST_STATUS_TONE } from "@/lib/status";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Inicio" };

export default function WorkerHome() {
  const ready = demoWorkerRequests.filter((r) => r.status === "Preparada").length;
  const firstName = demoWorkerUser.name.split(" ")[0];

  return (
    <WorkerPage title={`Hola, ${firstName}`} subtitle="¿Qué necesitas hoy?">
      <DemoNotice>Vista de ejemplo de la app del trabajador.</DemoNotice>

      {/* Acción principal */}
      <Link
        href="/mi/material"
        className="flex items-center gap-4 rounded-[var(--radius-xl)] bg-brand-600 p-5 text-white shadow-raised transition-transform active:scale-[0.99]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-lg)] bg-white/15">
          <PackagePlus className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="flex-1">
          <span className="block text-[18px] font-semibold">Solicitar material</span>
          <span className="block text-[14px] text-white/75">Elige obra, materiales y cantidades</span>
        </span>
        <ChevronRight className="h-5 w-5 text-white/70" aria-hidden="true" />
      </Link>

      {/* Acciones secundarias */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction href="/mi/material" icon={<PackageCheck className="h-5 w-5" />} title="Confirmar recepción" badge={ready ? `${ready} lista` : undefined} />
        <QuickAction href="/mi/obras" icon={<AlertTriangle className="h-5 w-5" />} title="Comunicar incidencia" />
      </div>

      {/* Obra actual */}
      <section aria-labelledby="hoy">
        <h2 id="hoy" className="mb-2 px-1 text-[13px] font-semibold tracking-wide text-muted uppercase">Tu obra actual</h2>
        <Card className="p-5">
          <p className="text-[12px] text-muted">{demoWorkerToday.code}</p>
          <p className="mt-0.5 text-[17px] font-semibold text-ink">{demoWorkerToday.project}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[14px] text-ink-2">
            <MapPin className="h-4 w-4 text-subtle" aria-hidden="true" />
            {demoWorkerToday.address}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="text-[13px] text-muted">{demoWorkerToday.role}</span>
            <Link href="/mi/obras" className="text-[14px] font-medium text-brand-600">Ver obra</Link>
          </div>
        </Card>
      </section>

      {/* Solicitudes */}
      <section aria-labelledby="solicitudes">
        <h2 id="solicitudes" className="mb-2 px-1 text-[13px] font-semibold tracking-wide text-muted uppercase">Mis solicitudes</h2>
        <Card className="divide-y divide-line">
          {demoWorkerRequests.map((r) => (
            <Link key={r.id} href="/mi/material" className="flex min-h-16 items-center gap-3 px-5 py-3.5 active:bg-surface">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-ink">{r.project}</p>
                <p className="text-[13px] text-muted">
                  {r.items} artículos · {formatDate(r.date)}
                </p>
              </div>
              <Badge tone={REQUEST_STATUS_TONE[r.status]}>{r.status}</Badge>
              <ChevronRight className="h-4 w-4 text-subtle" aria-hidden="true" />
            </Link>
          ))}
        </Card>
      </section>

      <Link href="/mi/perfil" className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-canvas p-4 shadow-card ring-1 ring-line/70">
        <Wrench className="h-5 w-5 text-subtle" aria-hidden="true" />
        <span className="flex-1 text-[15px] text-ink">Herramientas y vehículo asignados</span>
        <ChevronRight className="h-4 w-4 text-subtle" aria-hidden="true" />
      </Link>
    </WorkerPage>
  );
}

function QuickAction({ href, icon, title, badge }: { href: string; icon: React.ReactNode; title: string; badge?: string }) {
  return (
    <Link
      href={href}
      className="relative flex min-h-28 flex-col justify-between rounded-[var(--radius-lg)] bg-canvas p-4 shadow-card ring-1 ring-line/70 transition-transform active:scale-[0.98]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">{icon}</span>
      <span className="text-[15px] leading-snug font-medium text-ink">{title}</span>
      {badge && (
        <span className="absolute top-3 right-3">
          <Badge tone="warning">{badge}</Badge>
        </span>
      )}
    </Link>
  );
}
