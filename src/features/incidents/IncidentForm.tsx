"use client";

import { ActionForm } from "@/components/ui/ActionForm";
import { SelectField, TextAreaField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { updateIncident } from "./actions";
import { INCIDENT_STATUS, options } from "@/lib/labels";

export function IncidentStatusForm({ id, status, resolution }: { id: string; status: string; resolution: string | null }) {
  return (
    <ActionForm action={updateIncident}>
      <input type="hidden" name="id" value={id} />
      <SelectField label="Estado" name="status" options={options(INCIDENT_STATUS)} defaultValue={status} />
      <TextAreaField label="Resolución / respuesta al trabajador" name="resolution" defaultValue={resolution ?? undefined} />
      <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
    </ActionForm>
  );
}
