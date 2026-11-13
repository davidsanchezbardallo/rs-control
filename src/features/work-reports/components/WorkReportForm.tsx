"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Building2, ChevronDown, Clock, MapPin, Plus, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SignaturePad } from "./SignaturePad";
import { getPrefill, saveWorkReport } from "../actions";
import { CLIENT_SITE_FIELDS, hoursBetween, missingForSubmit, WORK_TYPES } from "../schema";
import { MAINTENANCE_TYPE, WORK_TYPE } from "@/lib/labels";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Option } from "@/features/lookups";

type Line = { key: string; description: string; technician_name: string; start_time: string; end_time: string };
export type ReportData = Record<string, string | null> & { work_types?: string[] };
type Problem = { field: string; message: string };

const CLIENT_FIELDS: [string, string, string?][] = [
  ["client_name", "Razón social / persona física"], ["client_tax_id", "CIF / NIF"], ["client_legal_rep", "Representante legal"],
  ["client_legal_rep_tax_id", "NIF del representante"], ["client_address", "Dirección"], ["client_city", "Localidad"],
  ["client_province", "Provincia"], ["client_postal_code", "C.P."], ["client_phone", "Teléfono", "tel"], ["client_email", "Email", "email"],
];
const SITE_FIELDS: [string, string, string?][] = [
  ["site_name", "Nombre comercial"], ["site_contact", "Contacto"], ["site_address", "Dirección"], ["site_phone", "Teléfono", "tel"],
  ["site_city", "Localidad"], ["site_province", "Provincia"], ["site_postal_code", "C.P."],
];

/** Sección del parte a la que lleva cada aviso (para desplazarse hasta ella). */
const SECTION_OF: Record<string, string> = {
  project_id: "wr-obra", report_date: "wr-obra", work_types: "wr-tipo", lines: "wr-orden",
  client_signature_path: "wr-firmas", company_signature_path: "wr-firmas",
};

function Section({ id, n, title, required, error, children, collapsible = false, defaultOpen = true }: {
  id?: string; n: number; title: string; required?: boolean; error?: string; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card id={id} className={cn("scroll-mt-20 p-4 sm:p-5", error && "ring-2 ring-danger")}>
      <button type="button" disabled={!collapsible} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 text-left" aria-expanded={open}>
        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold", error ? "bg-danger-soft text-danger" : "bg-brand-50 text-brand-700")}>{n}</span>
        <span className="flex-1 text-[16px] font-semibold text-ink">
          {title}
          {required && <span className="ml-1.5 text-[12px] font-medium text-muted">· obligatorio</span>}
        </span>
        {collapsible && <ChevronDown className={cn("h-5 w-5 text-subtle transition-transform", open && "rotate-180")} aria-hidden="true" />}
      </button>
      {error && <p role="alert" className="mt-2 flex items-center gap-1.5 text-[14px] font-medium text-danger"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
      <div className={cn("mt-4 space-y-4", !open && "hidden")}>{children}</div>
    </Card>
  );
}

/** Aviso a pantalla completa cuando falta algo al enviar (muy visible en el móvil). */
function MissingDialog({ problems, onClose }: { problems: Problem[]; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="wr-missing-title" className="w-full max-w-md rounded-[var(--radius-xl)] bg-canvas p-5 shadow-raised" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-warning-soft text-warning"><AlertTriangle className="h-6 w-6" aria-hidden="true" /></span>
          <h2 id="wr-missing-title" className="text-[18px] font-semibold text-ink">Falta completar el parte</h2>
        </div>
        <ul className="mt-4 space-y-2">
          {problems.map((p) => (
            <li key={p.field + p.message} className="flex gap-2 text-[15px] text-ink">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />
              {p.message}
            </li>
          ))}
        </ul>
        <Button ref={btn} type="button" size="lg" className="mt-5 w-full" onClick={onClose}>Entendido, lo completo</Button>
      </div>
    </div>
  );
}

const nowHHMM = () => new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" }).format(new Date());
const join = (...v: (string | null | undefined)[]) => v.filter(Boolean).join(", ");

/**
 * Parte de trabajo (plantilla «Parte técnico» de RS). Mismo formulario para el
 * trabajador (móvil) y para administración (revisión).
 * El trabajador no escribe los datos del cliente ni de la instalación: salen de la obra.
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
  const [pending, setPending] = useState({ client: false, company: false });
  const [tried, setTried] = useState(false);
  const [dialog, setDialog] = useState<Problem[] | null>(null);
  const set = (k: string, v: string | null) => setR((prev) => ({ ...prev, [k]: v }));
  const worker = mode === "worker";
  const newLine = (): Line => ({ key: crypto.randomUUID(), description: "", technician_name: worker ? myName : "", start_time: "", end_time: "" });

  const pickProject = (id: string) => {
    set("project_id", id || null);
    if (!id) return;
    start(async () => {
      const pf = await getPrefill(id);
      if (!pf) return;
      setR((prev) => {
        const next = { ...prev };
        for (const k of CLIENT_SITE_FIELDS) next[k] = (pf[k] as string | null) ?? null;
        return next;
      });
      setTeam([...new Set([myName, ...((pf.team as string[] | undefined) ?? [])])]);
      setLines((ls) => (ls.length ? ls : [newLine()]));
    });
  };

  const upd = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (hoursBetween(l.start_time, l.end_time) ?? 0), 0);
  const onClientPending = useCallback((p: boolean) => setPending((x) => (x.client === p ? x : { ...x, client: p })), []);
  const onCompanyPending = useCallback((p: boolean) => setPending((x) => (x.company === p ? x : { ...x, company: p })), []);

  /** Lo que falta para poder enviar (los borradores se guardan sin comprobar). */
  const problems = (): Problem[] => {
    const list: Problem[] = missingForSubmit({ ...r, work_types: types, lines }).map((m) =>
      m.field === "company_signature_path" && pending.company
        ? { field: m.field, message: "Has dibujado tu firma pero falta pulsar «Aceptar firma»." }
        : m.field === "company_signature_path"
          ? { field: m.field, message: "Falta la firma del trabajador (es obligatoria)." }
          : m,
    );
    if (pending.client) list.push({ field: "client_signature_path", message: "La firma del cliente está dibujada pero sin aceptar: pulsa «Aceptar firma» (o «Borrar» si no firma)." });
    return list;
  };
  const live = tried ? problems() : [];
  const errorOf = (field: string, server?: Record<string, string[] | undefined>) => live.find((p) => p.field === field)?.message ?? server?.[field]?.[0];

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const intent = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
    const list = problems();
    // Un borrador solo necesita la obra; el resto se puede completar después
    const blocking = intent === "draft" ? list.filter((p) => p.field === "project_id" || p.field === "report_date") : list;
    if (!blocking.length) return;
    e.preventDefault();
    setTried(true);
    setDialog(blocking);
    navigator.vibrate?.(200);
  };
  const closeDialog = () => {
    const first = dialog?.[0];
    setDialog(null);
    if (first) document.getElementById(SECTION_OF[first.field] ?? "")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const data = JSON.stringify({
    ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== "work_types").map(([k, v]) => [k, v ?? ""])),
    id: r.id || undefined,
    work_types: types,
    maintenance_type: r.maintenance_type || null,
    lines: lines.filter((l) => l.description.trim()).map((l) => ({ description: l.description, technician_name: l.technician_name, start_time: l.start_time, end_time: l.end_time })),
  });

  const hasClient = !!(r.client_name || r.site_name || r.site_address);
  let n = 0;

  return (
    <>
      <ActionForm action={saveWorkReport} onSubmit={onSubmit} noValidate className="space-y-4">
        {(s) => (
          <>
            <input type="hidden" name="data" value={data} />
            <Section id="wr-obra" n={++n} title="Obra y fecha" required error={errorOf("project_id", s.fieldErrors) ?? errorOf("report_date", s.fieldErrors)}>
              <SelectField label="Obra" options={projects} placeholder="Selecciona la obra" value={r.project_id ?? ""} onChange={(e) => pickProject(e.target.value)} />
              <TextField label="Fecha" type="date" value={r.report_date ?? today} onChange={(e) => set("report_date", e.target.value)} />
            </Section>

            {worker ? (
              // Trabajador: solo ve los datos (no los conoce ni tiene que escribirlos)
              r.project_id && (
                <Card className="space-y-3 p-4 sm:p-5" aria-live="polite">
                  {loading ? (
                    <p className="text-[14px] text-muted">Cargando datos de la obra…</p>
                  ) : hasClient ? (
                    <>
                      <div className="flex gap-3">
                        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-[12px] text-muted">Cliente</p>
                          <p className="text-[15px] font-medium text-ink">{r.client_name ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-[12px] text-muted">Instalación</p>
                          <p className="text-[15px] font-medium text-ink">{r.site_name ?? "—"}</p>
                          <p className="text-[14px] text-ink-2">{join(r.site_address, r.site_city) || "Sin dirección"}</p>
                          {(r.site_contact || r.site_phone) && <p className="text-[14px] text-ink-2">Contacto: {join(r.site_contact, r.site_phone)}</p>}
                        </div>
                      </div>
                      <p className="text-[13px] text-muted">Los datos del cliente (NIF, dirección…) se ponen solos desde la obra. Tú no tienes que rellenarlos.</p>
                    </>
                  ) : (
                    <p className="text-[14px] text-muted">Los datos del cliente los completa la oficina. Tú no tienes que rellenarlos.</p>
                  )}
                </Card>
              )
            ) : (
              <>
                <Section n={++n} title="Datos del cliente" collapsible defaultOpen>
                  <p className="text-[13px] text-muted">Se copian de la obra y del cliente. Si faltan, completa la ficha del cliente o de la obra para los próximos partes.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CLIENT_FIELDS.map(([k, label, type]) => (
                      <TextField key={k} label={label} type={type ?? "text"} value={r[k] ?? ""} onChange={(e) => set(k, e.target.value)} error={s.fieldErrors?.[k]} className={k === "client_name" || k === "client_address" ? "sm:col-span-2" : undefined} />
                    ))}
                  </div>
                </Section>
                <Section n={++n} title="Datos de la instalación" collapsible defaultOpen>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SITE_FIELDS.map(([k, label, type]) => (
                      <TextField key={k} label={label} type={type ?? "text"} value={r[k] ?? ""} onChange={(e) => set(k, e.target.value)} className={k === "site_name" || k === "site_address" ? "sm:col-span-2" : undefined} />
                    ))}
                  </div>
                </Section>
              </>
            )}

            <Section id="wr-tipo" n={++n} title="Tipo de trabajo" required error={errorOf("work_types", s.fieldErrors)}>
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

            <Section id="wr-orden" n={++n} title="Orden de trabajo" required error={errorOf("lines", s.fieldErrors)}>
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
              <button type="button" onClick={() => setLines((ls) => [...ls, newLine()])}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-line-strong text-[15px] font-medium text-brand-600 hover:bg-surface">
                <Plus className="h-4 w-4" /> Añadir trabajo
              </button>
              {total > 0 && <p className="text-right text-[14px] font-medium text-ink">Total: {formatNumber(total)} horas</p>}
            </Section>

            <Section n={++n} title="Trabajo realizado y observaciones">
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

            <Section id="wr-firmas" n={++n} title="Firmas" error={errorOf("company_signature_path", s.fieldErrors) ? "Falta la firma del trabajador." : undefined}>
              <SignaturePad label="Firma del trabajador" required userId={userId} path={r.company_signature_path ?? null} onChange={(p) => set("company_signature_path", p)} onPendingChange={onCompanyPending} error={errorOf("company_signature_path", s.fieldErrors)} />
              <TextField label="Nombre de quien firma por el cliente (opcional)" value={r.client_signer_name ?? ""} onChange={(e) => set("client_signer_name", e.target.value)} />
              <SignaturePad label="Firma del cliente" userId={userId} path={r.client_signature_path ?? null} onChange={(p) => set("client_signature_path", p)} onPendingChange={onClientPending} error={errorOf("client_signature_path")} />
            </Section>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {worker && (!status || status === "draft") && (
                <SubmitButton name="intent" value="draft" variant="secondary" size="lg" pendingText="Guardando…">Guardar borrador</SubmitButton>
              )}
              {worker ? (
                <SubmitButton name="intent" value="submit" size="lg" pendingText="Enviando…">{status === "submitted" ? "Guardar cambios" : "Enviar a administración"}</SubmitButton>
              ) : (
                <SubmitButton name="intent" value="save" size="lg" pendingText="Guardando…">Guardar parte</SubmitButton>
              )}
            </div>
          </>
        )}
      </ActionForm>
      {dialog && <MissingDialog problems={dialog} onClose={closeDialog} />}
    </>
  );
}
