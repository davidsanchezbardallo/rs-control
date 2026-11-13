"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Clock, Plus, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Card } from "@/components/ui/Card";
import { SignaturePad } from "./SignaturePad";
import { getPrefill, saveWorkReport } from "../actions";
import { hoursBetween, WORK_TYPES } from "../schema";
import { MAINTENANCE_TYPE, WORK_TYPE } from "@/lib/labels";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Option } from "@/features/lookups";

type Line = { key: string; description: string; technician_name: string; start_time: string; end_time: string };
export type ReportData = Record<string, string | null> & { work_types?: string[] };

const CLIENT_FIELDS: [string, string, string?][] = [
  ["client_name", "Razón social / persona física"], ["client_tax_id", "CIF / NIF"], ["client_legal_rep", "Representante legal"],
  ["client_legal_rep_tax_id", "NIF del representante"], ["client_address", "Dirección"], ["client_city", "Localidad"],
  ["client_province", "Provincia"], ["client_postal_code", "C.P."], ["client_phone", "Teléfono", "tel"], ["client_email", "Email", "email"],
];
const SITE_FIELDS: [string, string, string?][] = [
  ["site_name", "Nombre comercial"], ["site_contact", "Contacto"], ["site_address", "Dirección"], ["site_phone", "Teléfono", "tel"],
  ["site_city", "Localidad"], ["site_province", "Provincia"], ["site_postal_code", "C.P."],
];

function Section({ n, title, children, collapsible = false, defaultOpen = true }: { n: number; title: string; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-4 sm:p-5">
      <button type="button" disabled={!collapsible} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 text-left" aria-expanded={open}>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-[13px] font-semibold text-brand-700">{n}</span>
        <span className="flex-1 text-[16px] font-semibold text-ink">{title}</span>
        {collapsible && <ChevronDown className={cn("h-5 w-5 text-subtle transition-transform", open && "rotate-180")} aria-hidden="true" />}
      </button>
      <div className={cn("mt-4 space-y-4", !open && "hidden")}>{children}</div>
    </Card>
  );
}

const nowHHMM = () => new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" }).format(new Date());

/**
 * Parte de trabajo (plantilla «Parte técnico» de RS). Mismo formulario para el
 * trabajador (móvil) y para administración (revisión).
 */
export function WorkReportForm({
  projects, initial, initialLines, userId, myName, today, mode, status,
}: {
  projects: Option[];
  initial?: ReportData;
  initialLines?: { description: string; technician_name: string | null; start_time: string | null; end_time: string | null }[];
  userId: string;
  myName: string;
  today: string;
  mode: "worker" | "admin";
  status?: string;
}) {
  const [r, setR] = useState<ReportData>(initial ?? { report_date: today });
  const [types, setTypes] = useState<string[]>((initial?.work_types as string[] | undefined) ?? []);
  const [lines, setLines] = useState<Line[]>(
    (initialLines ?? []).map((l) => ({ key: crypto.randomUUID(), description: l.description, technician_name: l.technician_name ?? "", start_time: l.start_time?.slice(0, 5) ?? "", end_time: l.end_time?.slice(0, 5) ?? "" })),
  );
  const [team, setTeam] = useState<string[]>([myName]);
  const [loading, start] = useTransition();
  const set = (k: string, v: string | null) => setR((prev) => ({ ...prev, [k]: v }));
  const isNew = !r.id;

  const pickProject = (id: string) => {
    set("project_id", id || null);
    if (!id) return;
    start(async () => {
      const pf = await getPrefill(id);
      if (!pf) return;
      setR((prev) => {
        const next = { ...prev };
        for (const [k] of [...CLIENT_FIELDS, ...SITE_FIELDS]) next[k] = (pf[k] as string | null) ?? null;
        return next;
      });
      const t = (pf.team as string[] | undefined) ?? [];
      setTeam([...new Set([myName, ...t])]);
      if (!lines.length) setLines([{ key: crypto.randomUUID(), description: "", technician_name: mode === "worker" ? myName : "", start_time: "", end_time: "" }]);
    });
  };

  const upd = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (hoursBetween(l.start_time, l.end_time) ?? 0), 0);

  const data = JSON.stringify({
    ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== "work_types").map(([k, v]) => [k, v ?? ""])),
    id: r.id || undefined,
    work_types: types,
    maintenance_type: r.maintenance_type || null,
    lines: lines.filter((l) => l.description.trim()).map((l) => ({ description: l.description, technician_name: l.technician_name, start_time: l.start_time, end_time: l.end_time })),
  });

  return (
    <ActionForm action={saveWorkReport} className="space-y-4">
      {(s) => (
        <>
          <input type="hidden" name="data" value={data} />
          <Section n={1} title="Obra y fecha">
            <SelectField label="Obra" options={projects} placeholder="Selecciona la obra" value={r.project_id ?? ""} onChange={(e) => pickProject(e.target.value)} required error={s.fieldErrors?.project_id} />
            {loading && <p className="text-[13px] text-muted">Cargando datos de la obra…</p>}
            <TextField label="Fecha" type="date" value={r.report_date ?? today} onChange={(e) => set("report_date", e.target.value)} required error={s.fieldErrors?.report_date} />
          </Section>

          <Section n={2} title="Tipo de trabajo">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de trabajo">
              {WORK_TYPES.map((t) => {
                const on = types.includes(t);
                return (
                  <button key={t} type="button" aria-pressed={on} onClick={() => setTypes((x) => (on ? x.filter((y) => y !== t) : [...x, t]))}
                    className={cn("h-11 rounded-full px-4 text-[14px] ring-1 ring-inset", on ? "bg-brand-600 text-white ring-brand-600" : "bg-canvas text-ink-2 ring-line-strong")}>
                    {WORK_TYPE[t]}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section n={3} title="Datos del cliente" collapsible defaultOpen={mode === "admin" || !isNew}>
            <p className="text-[13px] text-muted">Se rellenan solos desde la obra. Corrige lo que haga falta.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CLIENT_FIELDS.map(([k, label, type]) => (
                <TextField key={k} label={label} type={type ?? "text"} value={r[k] ?? ""} onChange={(e) => set(k, e.target.value)} error={s.fieldErrors?.[k]} className={k === "client_name" || k === "client_address" ? "sm:col-span-2" : undefined} />
              ))}
            </div>
          </Section>

          <Section n={4} title="Datos de la instalación" collapsible defaultOpen={mode === "admin" || !isNew}>
            <div className="grid gap-3 sm:grid-cols-2">
              {SITE_FIELDS.map(([k, label, type]) => (
                <TextField key={k} label={label} type={type ?? "text"} value={r[k] ?? ""} onChange={(e) => set(k, e.target.value)} className={k === "site_name" || k === "site_address" ? "sm:col-span-2" : undefined} />
              ))}
            </div>
          </Section>

          <Section n={5} title="Orden de trabajo">
            <datalist id="wr-team">{team.map((t) => <option key={t} value={t} />)}</datalist>
            <ul className="space-y-3">
              {lines.map((l, i) => {
                const h = hoursBetween(l.start_time, l.end_time);
                return (
                  <li key={l.key} className="space-y-3 rounded-[var(--radius-lg)] bg-surface p-3">
                    <div className="flex items-start gap-2">
                      <TextAreaField label={`Trabajo ${i + 1}`} rows={2} value={l.description} onChange={(e) => upd(l.key, { description: e.target.value })} className="flex-1" placeholder="Ej.: revisión del cuadro general" />
                      <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Quitar línea" className="mt-7 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <TextField label="Técnico" list="wr-team" value={l.technician_name} onChange={(e) => upd(l.key, { technician_name: e.target.value })} />
                    <div className="grid grid-cols-2 gap-3">
                      {(["start_time", "end_time"] as const).map((f) => (
                        <div key={f} className="space-y-1.5">
                          <TextField label={f === "start_time" ? "Hora inicio" : "Hora final"} type="time" value={l[f]} onChange={(e) => upd(l.key, { [f]: e.target.value })} />
                          <button type="button" onClick={() => upd(l.key, { [f]: nowHHMM() })} className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600">
                            <Clock className="h-3.5 w-3.5" /> Ahora
                          </button>
                        </div>
                      ))}
                    </div>
                    {h !== null && <p className="text-[13px] text-muted">{formatNumber(h)} horas</p>}
                  </li>
                );
              })}
            </ul>
            <button type="button" onClick={() => setLines((ls) => [...ls, { key: crypto.randomUUID(), description: "", technician_name: mode === "worker" ? myName : "", start_time: "", end_time: "" }])}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-line-strong text-[15px] font-medium text-brand-600 hover:bg-surface">
              <Plus className="h-4 w-4" /> Añadir trabajo
            </button>
            {total > 0 && <p className="text-right text-[14px] font-medium text-ink">Total: {formatNumber(total)} horas</p>}
            {s.fieldErrors?.lines && <p className="text-[13px] text-danger">{s.fieldErrors.lines[0]}</p>}
          </Section>

          <Section n={6} title="Trabajo realizado y observaciones">
            <TextAreaField label="Trabajo realizado" rows={5} value={r.work_done ?? ""} onChange={(e) => set("work_done", e.target.value)} hint="Consejo: en el móvil puedes dictarlo con el micrófono del teclado." />
            <TextAreaField label="Observaciones" rows={3} value={r.observations ?? ""} onChange={(e) => set("observations", e.target.value)} />
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-ink-2">Tipo de mantenimiento</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(MAINTENANCE_TYPE).map(([v, label]) => (
                  <button key={v} type="button" aria-pressed={r.maintenance_type === v} onClick={() => set("maintenance_type", r.maintenance_type === v ? null : v)}
                    className={cn("min-h-11 rounded-[var(--radius-md)] px-2 py-1 text-[14px] leading-tight ring-1 ring-inset", r.maintenance_type === v ? "bg-brand-600 text-white ring-brand-600" : "bg-canvas text-ink-2 ring-line-strong")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section n={7} title="Firmas">
            <TextField label="Nombre de quien firma por el cliente" value={r.client_signer_name ?? ""} onChange={(e) => set("client_signer_name", e.target.value)} />
            <SignaturePad label="Firma del cliente" userId={userId} path={r.client_signature_path ?? null} onChange={(p) => set("client_signature_path", p)} />
            <SignaturePad label="Firma de la empresa (técnico)" userId={userId} path={r.company_signature_path ?? null} onChange={(p) => set("company_signature_path", p)} />
          </Section>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {mode === "worker" && (!status || status === "draft") && (
              <SubmitButton name="intent" value="draft" variant="secondary" size="lg" pendingText="Guardando…">Guardar borrador</SubmitButton>
            )}
            {mode === "worker" ? (
              <SubmitButton name="intent" value="submit" size="lg" pendingText="Enviando…">{status === "submitted" ? "Guardar cambios" : "Enviar a administración"}</SubmitButton>
            ) : (
              <SubmitButton name="intent" value="save" size="lg" pendingText="Guardando…">Guardar parte</SubmitButton>
            )}
          </div>
        </>
      )}
    </ActionForm>
  );
}
