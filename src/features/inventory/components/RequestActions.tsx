"use client";

import { Ban, Check, PackageCheck, Search, X } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import { setRequestStatus } from "../actions";

/** Botones de cambio de estado de una solicitud (administración). */
export function RequestStatusActions({ requestId, status }: { requestId: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionForm action={setRequestStatus} className="flex flex-wrap gap-2">
        <input type="hidden" name="request_id" value={requestId} />
        {status === "pending" && (
          <Button type="submit" name="status" value="in_review" variant="ghost" icon={<Search className="h-4 w-4" />}>En revisión</Button>
        )}
        {["pending", "in_review"].includes(status) && (
          <Button type="submit" name="status" value="approved" variant="secondary" icon={<Check className="h-4 w-4" />}>Aprobar</Button>
        )}
        {["pending", "in_review", "approved"].includes(status) && (
          <Button type="submit" name="status" value="prepared" variant="secondary" icon={<PackageCheck className="h-4 w-4" />}>Marcar preparada</Button>
        )}
      </ActionForm>
      <Dialog trigger="Rechazar" triggerVariant="ghost" triggerIcon={<Ban className="h-4 w-4" />} title="Rechazar solicitud" description="El trabajador recibirá una notificación con el motivo.">
        {(close) => (
          <ActionForm action={setRequestStatus} onSuccess={close}>
            {(s) => (
              <>
                <input type="hidden" name="request_id" value={requestId} />
                <input type="hidden" name="status" value="rejected" />
                <TextAreaField label="Motivo del rechazo" name="reason" required error={s.fieldErrors?.reason} />
                <div className="flex justify-end">
                  <SubmitButton variant="danger" icon={<X className="h-4 w-4" />}>Rechazar</SubmitButton>
                </div>
              </>
            )}
          </ActionForm>
        )}
      </Dialog>
    </div>
  );
}

/** Cancelar una solicitud pendiente (trabajador). */
export function CancelRequestButton({ requestId }: { requestId: string }) {
  return (
    <ActionForm action={setRequestStatus}>
      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="status" value="cancelled" />
      <SubmitButton variant="ghost" size="lg" className="w-full text-danger" pendingText="Cancelando…">Cancelar solicitud</SubmitButton>
    </ActionForm>
  );
}
