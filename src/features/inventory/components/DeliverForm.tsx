"use client";

import { ActionForm } from "@/components/ui/ActionForm";
import { TextAreaField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { LinesEditor } from "./LinesEditor";
import { registerIssue } from "../actions";

type Prefill = { material_id: string; name: string; code: string; unit: string; decimals: boolean; max: number; quantity: number };

/** Entrega de una solicitud: genera la salida (descuenta stock) y notifica al trabajador. */
export function DeliverForm({ requestId, projectId, employeeId, lines }: { requestId: string; projectId: string; employeeId: string; lines: Prefill[] }) {
  return (
    <ActionForm action={registerIssue}>
      {(s) => (
        <>
          <input type="hidden" name="request_id" value={requestId} />
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="employee_id" value={employeeId} />
          <LinesEditor
            mode="issue"
            error={s.fieldErrors?.lines}
            initial={lines.map((l) => ({ key: l.material_id, material_id: l.material_id, name: l.name, code: l.code, unit: l.unit, decimals: l.decimals, max: l.max, quantity: String(l.quantity).replace(".", ",") }))}
          />
          <TextAreaField label="Observaciones (opcional)" name="notes" />
          <div className="flex justify-end">
            <SubmitButton size="lg" icon={undefined} pendingText="Registrando entrega…">Confirmar entrega</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
