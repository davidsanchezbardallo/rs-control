import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { IncidentStatusForm } from "@/features/incidents/IncidentForm";
import { INCIDENT_STATUS, SEVERITY } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Incidencia" };

export default async function Page(props: PageProps<"/incidencias/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireAdmin();
  const { data: i } = await supabase.from("incidents").select("*, project:projects(id, code, name), vehicle:vehicles(id, plate), reporter:employees(id, first_name, last_name, phone)").eq("id", id).maybeSingle();
  if (!i) notFound();
  return (
    <div className="space-y-6">
      <BackLink href="/incidencias">Incidencias</BackLink>
      <PageHeader eyebrow={<span className="flex gap-2"><Badge tone={SEVERITY[i.severity].tone}>{SEVERITY[i.severity].label}</Badge><Badge tone={INCIDENT_STATUS[i.status].tone}>{INCIDENT_STATUS[i.status].label}</Badge></span>} title={i.title} description={`${i.number} · ${formatDateTime(i.created_at)}`} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Detalle" />
          <CardBody className="space-y-5">
            <DescriptionList
              items={[
                { label: "Obra", value: i.project && <Link className="text-brand-600" href={`/obras/${i.project.id}`}>{i.project.code} · {i.project.name}</Link> },
                { label: "Vehículo", value: i.vehicle && <Link className="text-brand-600" href={`/vehiculos/${i.vehicle.id}`}>{i.vehicle.plate}</Link> },
                { label: "Comunicada por", value: i.reporter && <Link className="text-brand-600" href={`/trabajadores/${i.reporter.id}`}>{i.reporter.first_name} {i.reporter.last_name}</Link> },
                { label: "Teléfono", value: i.reporter?.phone },
              ]}
            />
            {i.description && <p className="rounded-[var(--radius-md)] bg-surface px-4 py-3 text-[14px] text-ink-2">{i.description}</p>}
            {i.photo_paths.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {i.photo_paths.map((p: string) => (
                  <a key={p} href={`/api/fotos?p=${encodeURIComponent(p)}`} target="_blank" rel="noopener" className="block h-28 w-28 overflow-hidden rounded-[var(--radius-md)] bg-surface ring-1 ring-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/fotos?p=${encodeURIComponent(p)}`} alt="Foto de la incidencia" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Gestión" description="El trabajador recibe un aviso al cambiar el estado." />
          <CardBody><IncidentStatusForm id={i.id} status={i.status} resolution={i.resolution} /></CardBody>
        </Card>
      </div>
    </div>
  );
}
