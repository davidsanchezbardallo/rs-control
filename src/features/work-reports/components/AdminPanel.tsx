"use client";

import { CheckCircle2, Undo2 } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { setWorkReportAmount, setWorkReportStatus } from "../actions";

/** Validar o devolver el parte al trabajador. */
export function WorkReportStatusForm({ id, status }: { id: string; status: string }) {
  return (
    <ActionForm action={setWorkReportStatus} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {status !== "validated" ? (
        <>
          <p className="text-[14px] text-ink-2">Al validar, el trabajador ya no puede modificarlo y recibe un aviso.</p>
          <SubmitButton name="status" value="validated" className="w-full" icon={<CheckCircle2 className="h-4 w-4" />} pendingText="Validando…">Validar parte</SubmitButton>
        </>
      ) : (
        <>
          <p className="text-[14px] text-ink-2">Parte validado. Si hay que corregir algo, puedes devolverlo al trabajador.</p>
          <SubmitButton name="status" value="submitted" variant="secondary" className="w-full" icon={<Undo2 className="h-4 w-4" />} pendingText="Devolviendo…">Devolver para corregir</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

/** Importe del parte (IVA no incluido). Solo administración. */
export function WorkReportAmountForm({ id, amount }: { id: string; amount: number | null }) {
  return (
    <ActionForm action={setWorkReportAmount} className="space-y-3">
      {(s) => (
        <>
          <input type="hidden" name="id" value={id} />
          <TextField label="Importe (IVA no incluido)" name="amount" inputMode="decimal" defaultValue={amount == null ? "" : amount.toFixed(2).replace(".", ",")} placeholder="0,00" hint="Solo lo ve administración. Aparece en el PDF que descargáis vosotros." error={s.fieldErrors?.amount} />
          <SubmitButton variant="secondary" className="w-full" pendingText="Guardando…">Guardar importe</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
