"use client";

import { useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, LogOut as Leave, PackageCheck, X } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Card } from "@/components/ui/Card";
import { LinesEditor } from "@/features/inventory/components/LinesEditor";
import { confirmReception, createRequest, registerIssue } from "@/features/inventory/actions";
import { createIncident, joinProject, leaveProject, setVehicle } from "../actions";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { PRIORITY, SEVERITY, options } from "@/lib/labels";
import type { Option } from "@/features/lookups";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <h2 className="flex items-center gap-2.5 text-[16px] font-semibold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-[13px] text-brand-700">{n}</span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

/** Solicitar material: obra → materiales → enviar. */
export function RequestForm({ projects, defaultProject }: { projects: Option[]; defaultProject?: string }) {
  return (
    <ActionForm action={createRequest} className="space-y-4">
      {(s) => (
        <>
          <Step n={1} title="¿Para qué obra?">
            <SelectField label="Obra" name="project_id" options={projects} placeholder="Selecciona la obra" defaultValue={defaultProject} required error={s.fieldErrors?.project_id} />
          </Step>
          <Step n={2} title="¿Qué material necesitas?">
            <LinesEditor mode="request" error={s.fieldErrors?.lines} />
          </Step>
          <Step n={3} title="Detalles (opcional)">
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Prioridad" name="priority" options={options(PRIORITY)} defaultValue="normal" />
              <TextField label="Lo necesito para" name="needed_by" type="date" />
            </div>
            <TextAreaField label="Observaciones" name="notes" placeholder="Ej.: para la planta 2" />
          </Step>
          <SubmitButton size="lg" className="w-full" pendingText="Enviando…">Enviar solicitud</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

/** Salida directa: el trabajador retira material de la nave para una obra. */
export function WorkerIssueForm({ projects, defaultProject }: { projects: Option[]; defaultProject?: string }) {
  return (
    <ActionForm action={registerIssue} className="space-y-4">
      {(s) => (
        <>
          <Step n={1} title="¿Para qué obra es?">
            <SelectField label="Obra" name="project_id" options={projects} placeholder="Selecciona la obra" defaultValue={defaultProject} required error={s.fieldErrors?.project_id} />
          </Step>
          <Step n={2} title="¿Qué material te llevas?">
            <LinesEditor mode="issue" error={s.fieldErrors?.lines} />
          </Step>
          <Step n={3} title="Observaciones (opcional)">
            <TextAreaField label="Observaciones" name="notes" />
          </Step>
          <SubmitButton size="lg" className="w-full" pendingText="Registrando…">Registrar salida</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ConfirmReceptionButton({ documentId }: { documentId: string }) {
  return (
    <ActionForm action={confirmReception} className="space-y-2">
      <input type="hidden" name="document_id" value={documentId} />
      <SubmitButton size="lg" className="w-full" icon={<PackageCheck className="h-5 w-5" />} pendingText="Confirmando…">
        Confirmar que lo he recibido
      </SubmitButton>
    </ActionForm>
  );
}

export function JoinProjectForm({ projects }: { projects: Option[] }) {
  return (
    <ActionForm action={joinProject} className="space-y-3" resetOnSuccess>
      {(s) => (
        <>
          <SelectField label="Añadir obra en la que trabajo" name="project_id" options={projects} placeholder="Selecciona una obra" required error={s.fieldErrors?.project_id} />
          <SubmitButton variant="secondary" size="lg" className="w-full" icon={<Check className="h-4 w-4" />}>Estoy en esta obra</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function LeaveProjectButton({ projectId }: { projectId: string }) {
  return (
    <ActionForm action={leaveProject} className="contents">
      <input type="hidden" name="project_id" value={projectId} />
      <SubmitButton variant="ghost" size="sm" icon={<Leave className="h-4 w-4" />} pendingText="…">Dejar</SubmitButton>
    </ActionForm>
  );
}

export function VehicleForm({ vehicles, current }: { vehicles: Option[]; current?: string }) {
  return (
    <ActionForm action={setVehicle} className="space-y-3">
      <SelectField label="Vehículo que llevo" name="vehicle_id" options={vehicles} placeholder="Ninguno" defaultValue={current} />
      <SubmitButton variant="secondary" size="lg" className="w-full">Guardar vehículo</SubmitButton>
    </ActionForm>
  );
}

/** Incidencia con fotos opcionales (se suben directamente a un almacenamiento privado). */
export function IncidentForm({ projects, vehicles, userId, defaultProject }: { projects: Option[]; vehicles: Option[]; userId: string; defaultProject?: string }) {
  const [photos, setPhotos] = useState<{ path: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(undefined);
    const sb = createBrowserSupabase();
    const added: { path: string; url: string }[] = [];
    for (const f of Array.from(files).slice(0, 6 - photos.length)) {
      if (f.size > 10 * 1024 * 1024) {
        setUploadError("Cada foto debe pesar menos de 10 MB.");
        continue;
      }
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from("incident-photos").upload(path, f, { contentType: f.type, upsert: false });
      if (error) setUploadError("No se ha podido subir una foto. Inténtalo de nuevo.");
      else added.push({ path, url: URL.createObjectURL(f) });
    }
    setPhotos((p) => [...p, ...added]);
    setUploading(false);
    if (input.current) input.current.value = "";
  }

  return (
    <ActionForm action={createIncident} className="space-y-4">
      {(s) => (
        <>
          <input type="hidden" name="photos" value={photos.map((p) => p.path).join("|")} />
          <Step n={1} title="¿Dónde ocurre?">
            <SelectField label="Obra" name="project_id" options={projects} placeholder="—" defaultValue={defaultProject} error={s.fieldErrors?.project_id} />
            <SelectField label="O vehículo" name="vehicle_id" options={vehicles} placeholder="—" />
          </Step>
          <Step n={2} title="¿Qué pasa?">
            <TextField label="Resumen" name="title" placeholder="Ej.: falta tensión en el cuadro de obra" required error={s.fieldErrors?.title} />
            <TextAreaField label="Descripción (opcional)" name="description" />
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gravedad">
              {options(SEVERITY).map((o) => (
                <label key={o.value} className="flex h-12 cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-surface text-[14px] text-ink-2 has-[:checked]:bg-brand-600 has-[:checked]:text-white">
                  <input type="radio" name="severity" value={o.value} defaultChecked={o.value === "medium"} className="sr-only" />
                  {o.label}
                </label>
              ))}
            </div>
          </Step>
          <Step n={3} title="Fotos (opcional)">
            <input ref={input} type="file" accept="image/*" capture="environment" multiple className="sr-only" id="incident-photos" onChange={(e) => onFiles(e.target.files)} />
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <div key={p.path} className="relative h-20 w-20 overflow-hidden rounded-[var(--radius-md)] bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="Foto adjunta" className="h-full w-full object-cover" />
                  <button type="button" aria-label="Quitar foto" onClick={() => setPhotos((ps) => ps.filter((x) => x.path !== p.path))} className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <label htmlFor="incident-photos" className="grid h-20 w-20 cursor-pointer place-items-center rounded-[var(--radius-md)] border border-dashed border-line-strong text-muted hover:bg-surface">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : photos.length ? <ImagePlus className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                  <span className="sr-only">Añadir foto</span>
                </label>
              )}
            </div>
            {uploadError && <p className="text-[13px] text-danger">{uploadError}</p>}
          </Step>
          <SubmitButton size="lg" className="w-full" disabled={uploading} pendingText="Enviando…">Comunicar incidencia</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
