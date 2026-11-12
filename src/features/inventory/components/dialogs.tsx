"use client";

import { Pencil, RotateCcw } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { ActionForm } from "@/components/ui/ActionForm";
import { TextAreaField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { MaterialForm } from "./forms";
import { reverseDocument } from "../actions";
import type { Option } from "@/features/lookups";

export function EditMaterialDialog(props: React.ComponentProps<typeof MaterialForm> & { categories: Option[] }) {
  return (
    <Dialog trigger="Editar" triggerIcon={<Pencil className="h-4 w-4" />} title="Editar material" wide>
      {() => <MaterialForm {...props} />}
    </Dialog>
  );
}

export function ReverseDocumentDialog({ documentId, number }: { documentId: string; number: string }) {
  return (
    <Dialog
      trigger="Anular"
      triggerVariant="ghost"
      triggerIcon={<RotateCcw className="h-4 w-4" />}
      title={`Anular ${number}`}
      description="Se creará un documento inverso que deshace exactamente este movimiento. El original no se borra y ambos quedan en el historial."
    >
      {(close) => (
        <ActionForm action={reverseDocument}>
          {(s) => (
            <>
              <input type="hidden" name="document_id" value={documentId} />
              <TextAreaField label="Motivo de la anulación" name="reason" required error={s.fieldErrors?.reason} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={close} className="h-10 rounded-[var(--radius-md)] px-4 text-[14px] text-ink-2 hover:bg-surface">Cancelar</button>
                <SubmitButton variant="danger" pendingText="Anulando…">Anular documento</SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}
