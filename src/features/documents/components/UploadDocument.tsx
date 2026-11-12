"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { prepareUpload, registerDocument } from "../actions";
import { DOCUMENT_CATEGORY, options } from "@/lib/labels";
import type { ActionState } from "@/lib/actions";

export function UploadDocument({ entity, entityId, defaultCategory = "other", categories }: { entity: "employee" | "project" | "vehicle" | "invoice" | "company"; entityId?: string; defaultCategory?: string; categories?: string[] }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({ ok: false });
  const [busy, setBusy] = useState(false);
  const cats = options(DOCUMENT_CATEGORY).filter((o) => !categories || categories.includes(o.value));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>, close: () => void) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    if (!file || !file.size) return setState({ ok: false, message: "Elige un archivo." });
    setBusy(true);
    setState({ ok: false });
    const prep = await prepareUpload({ entity, entityId, filename: file.name, mime: file.type, size: file.size });
    if ("error" in prep && prep.error) {
      setBusy(false);
      return setState({ ok: false, message: prep.error });
    }
    const { path, token } = prep as { path: string; token: string };
    const up = await createBrowserSupabase().storage.from("documents").uploadToSignedUrl(path, token, file, { contentType: file.type });
    if (up.error) {
      setBusy(false);
      return setState({ ok: false, message: "No se ha podido subir el archivo." });
    }
    const res = await registerDocument({
      entity, entityId, path, mime: file.type, size: file.size,
      title: String(fd.get("title") || file.name),
      category: String(fd.get("category")),
      issued_on: (fd.get("issued_on") as string) || undefined,
      expires_on: (fd.get("expires_on") as string) || undefined,
    });
    setBusy(false);
    setState(res);
    if (res.ok) {
      router.refresh();
      close();
    }
  }

  return (
    <Dialog trigger="Subir documento" triggerSize="sm" triggerIcon={<Upload className="h-4 w-4" />} title="Subir documento" description="PDF, imágenes, Excel o Word. Máximo 25 MB. Se guarda en almacenamiento privado.">
      {(close) => (
        <form onSubmit={(e) => onSubmit(e, close)} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Archivo</span>
            <input name="file" type="file" required accept=".pdf,image/*,.xlsx,.docx" className="block w-full text-[14px] text-ink-2 file:mr-3 file:h-10 file:rounded-[var(--radius-md)] file:border-0 file:bg-surface file:px-4 file:text-[14px] file:font-medium file:text-ink" />
          </label>
          <TextField label="Título" name="title" placeholder="Si lo dejas vacío, se usa el nombre del archivo" />
          <SelectField label="Tipo de documento" name="category" options={cats} defaultValue={defaultCategory} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Fecha del documento" name="issued_on" type="date" />
            <TextField label="Caduca el" name="expires_on" type="date" hint="Genera aviso 30 días antes" />
          </div>
          <FormMessage state={state} />
          <div className="flex justify-end">
            <Button type="submit" disabled={busy}>{busy ? "Subiendo…" : "Guardar documento"}</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
