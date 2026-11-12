import { FileText } from "lucide-react";
import type { Supabase } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UploadDocument } from "./UploadDocument";
import { DeleteDocumentButton } from "./DeleteDocumentButton";
import { DOCUMENT_CATEGORY } from "@/lib/labels";
import { formatDate } from "@/lib/utils/format";
import { dueTone } from "@/lib/utils/dates";

type Entity = "employee" | "project" | "vehicle" | "invoice" | "company";

/** Lista de documentos de una ficha, con subida, descarga segura y caducidades. */
export async function DocumentsCard({ supabase, entity, entityId, title = "Documentación", defaultCategory, categories }: { supabase: Supabase; entity: Entity; entityId?: string; title?: string; defaultCategory?: string; categories?: string[] }) {
  let q = supabase.from("documents").select("id, title, category, issued_on, expires_on, size_bytes, created_at").order("created_at", { ascending: false });
  q = entity === "company" ? q.is("employee_id", null).is("project_id", null).is("vehicle_id", null).is("invoice_id", null) : q.eq(`${entity}_id`, entityId!);
  const { data } = await q;
  return (
    <Card>
      <CardHeader title={title} description="Archivos privados: solo administración puede verlos." action={<UploadDocument entity={entity} entityId={entityId} defaultCategory={defaultCategory} categories={categories} />} />
      <ul className="mt-3 divide-y divide-line">
        {(data ?? []).map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
            <FileText className="h-5 w-5 shrink-0 text-subtle" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <a href={`/api/documentos/${d.id}`} target="_blank" rel="noopener" className="block truncate text-[14px] font-medium text-ink hover:text-brand-600">{d.title}</a>
              <p className="text-[12px] text-muted">
                {DOCUMENT_CATEGORY[d.category]}
                {d.issued_on ? ` · ${formatDate(d.issued_on)}` : ""}
                {d.size_bytes ? ` · ${Math.max(1, Math.round(Number(d.size_bytes) / 1024))} KB` : ""}
              </p>
            </div>
            {d.expires_on && (
              <Badge tone={dueTone(d.expires_on)}>
                {dueTone(d.expires_on) === "danger" ? "Caducado" : "Caduca"} {formatDate(d.expires_on)}
              </Badge>
            )}
            <DeleteDocumentButton id={d.id} />
          </li>
        ))}
        {!data?.length && <li className="px-6 py-8 text-center text-[14px] text-muted">Sin documentos.</li>}
      </ul>
    </Card>
  );
}
