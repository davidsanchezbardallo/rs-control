import { DescriptionList } from "@/components/ui/DescriptionList";
import { Card } from "@/components/ui/Card";
import { MAINTENANCE_TYPE, WORK_TYPE } from "@/lib/labels";
import { formatDate, formatNumber } from "@/lib/utils/format";
import type { WorkReport } from "../queries";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-3 p-4 sm:p-5">
      <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
      {children}
    </Card>
  );
}

/** Parte en modo lectura (validado, o vista rápida). */
export function WorkReportView({ r }: { r: WorkReport }) {
  const total = r.lines.reduce((s, l) => s + Number(l.hours ?? 0), 0);
  return (
    <div className="space-y-4">
      <Block title="Obra y tipo de trabajo">
        <DescriptionList
          items={[
            { label: "Obra", value: r.project ? `${r.project.code} · ${r.project.name}` : "—" },
            { label: "Fecha", value: formatDate(r.report_date) },
            { label: "Tipo", value: r.work_types.map((t) => WORK_TYPE[t]).join(", ") || "—" },
            { label: "Mantenimiento", value: r.maintenance_type ? MAINTENANCE_TYPE[r.maintenance_type] : "—" },
          ]}
        />
      </Block>
      <Block title="Cliente">
        <DescriptionList
          items={[
            { label: "Razón social", value: r.client_name ?? "—" },
            { label: "CIF / NIF", value: r.client_tax_id ?? "—" },
            { label: "Representante", value: [r.client_legal_rep, r.client_legal_rep_tax_id].filter(Boolean).join(" · ") || "—" },
            { label: "Dirección", value: [r.client_address, r.client_postal_code, r.client_city, r.client_province].filter(Boolean).join(", ") || "—" },
            { label: "Contacto", value: [r.client_phone, r.client_email].filter(Boolean).join(" · ") || "—" },
          ]}
        />
      </Block>
      <Block title="Instalación">
        <DescriptionList
          items={[
            { label: "Nombre", value: r.site_name ?? "—" },
            { label: "Contacto", value: [r.site_contact, r.site_phone].filter(Boolean).join(" · ") || "—" },
            { label: "Dirección", value: [r.site_address, r.site_postal_code, r.site_city, r.site_province].filter(Boolean).join(", ") || "—" },
          ]}
        />
      </Block>
      <Block title="Orden de trabajo">
        {r.lines.length ? (
          <ul className="divide-y divide-line">
            {r.lines.map((l) => (
              <li key={l.position} className="py-2.5">
                <p className="text-[15px] text-ink">{l.description}</p>
                <p className="text-[13px] text-muted">
                  {[l.technician_name, l.start_time && `${l.start_time.slice(0, 5)}–${l.end_time?.slice(0, 5) ?? ""}`, l.hours != null && `${formatNumber(Number(l.hours))} h`].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted">Sin líneas.</p>
        )}
        {total > 0 && <p className="text-right text-[14px] font-medium text-ink">Total: {formatNumber(total)} horas</p>}
      </Block>
      <Block title="Trabajo realizado">
        <p className="text-[15px] whitespace-pre-line text-ink">{r.work_done || "—"}</p>
        {r.observations && (
          <>
            <h3 className="pt-2 text-[13px] font-medium text-muted">Observaciones</h3>
            <p className="text-[15px] whitespace-pre-line text-ink">{r.observations}</p>
          </>
        )}
      </Block>
      <Block title="Firmas">
        <div className="grid gap-4 sm:grid-cols-2">
          {([["Cliente", r.client_signature_path, r.client_signer_name], ["Empresa", r.company_signature_path, null]] as const).map(([label, path, name]) => (
            <div key={label} className="space-y-1.5">
              <p className="text-[13px] font-medium text-muted">{label}{name ? ` · ${name}` : ""}</p>
              {path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/firmas?p=${encodeURIComponent(path)}`} alt={`Firma ${label.toLowerCase()}`} className="h-24 w-full rounded-[var(--radius-md)] bg-canvas object-contain ring-1 ring-line" />
              ) : (
                <p className="text-[14px] text-muted">Sin firma</p>
              )}
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}
