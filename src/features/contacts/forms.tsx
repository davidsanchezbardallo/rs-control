"use client";

import { Pencil, Plus } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveClient, saveSupplier } from "./actions";
import { CLIENT_KIND, options } from "@/lib/labels";

type Rec = Record<string, string | number | boolean | null | undefined>;
const v = (r: Rec | undefined, k: string) => (r?.[k] === null || r?.[k] === undefined ? undefined : String(r[k]));

export function ClientDialog({ c }: { c?: Rec }) {
  return (
    <Dialog trigger={c ? "Editar" : "Nuevo cliente"} triggerVariant={c ? "ghost" : "primary"} triggerSize="sm" triggerIcon={c ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} title={c ? "Editar cliente" : "Nuevo cliente"} wide>
      {() => (
        <ActionForm action={saveClient}>
          {(s) => (
            <>
              {c && <input type="hidden" name="id" value={String(c.id)} />}
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField label="Tipo" name="kind" options={options(CLIENT_KIND)} defaultValue={v(c, "kind")} />
                <TextField label="Nombre o razón social" name="name" defaultValue={v(c, "name")} required className="sm:col-span-2" error={s.fieldErrors?.name} />
                <TextField label="CIF / NIF" name="tax_id" defaultValue={v(c, "tax_id")} />
                <TextField label="Dirección" name="address" defaultValue={v(c, "address")} />
                <TextField label="Localidad" name="city" defaultValue={v(c, "city")} />
                <TextField label="Persona de contacto" name="contact_name" defaultValue={v(c, "contact_name")} />
                <TextField label="Teléfono" name="phone" defaultValue={v(c, "phone")} />
                <TextField label="Email" name="email" type="email" defaultValue={v(c, "email")} error={s.fieldErrors?.email} />
              </div>
              <TextAreaField label="Observaciones" name="notes" defaultValue={v(c, "notes")} />
              <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function SupplierDialog({ p }: { p?: Rec }) {
  return (
    <Dialog trigger={p ? "Editar" : "Nuevo proveedor"} triggerVariant={p ? "ghost" : "primary"} triggerSize="sm" triggerIcon={p ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} title={p ? "Editar proveedor" : "Nuevo proveedor"} wide>
      {() => (
        <ActionForm action={saveSupplier}>
          {(s) => (
            <>
              {p && <input type="hidden" name="id" value={String(p.id)} />}
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField label="Nombre o razón social" name="name" defaultValue={v(p, "name")} required className="sm:col-span-2" error={s.fieldErrors?.name} />
                <TextField label="CIF / NIF" name="tax_id" defaultValue={v(p, "tax_id")} />
                <TextField label="Persona de contacto" name="contact_name" defaultValue={v(p, "contact_name")} />
                <TextField label="Teléfono" name="phone" defaultValue={v(p, "phone")} />
                <TextField label="Email" name="email" type="email" defaultValue={v(p, "email")} error={s.fieldErrors?.email} />
                <TextField label="Días de pago" name="payment_terms_days" inputMode="numeric" defaultValue={v(p, "payment_terms_days")} />
              </div>
              <TextAreaField label="Observaciones" name="notes" defaultValue={v(p, "notes")} />
              <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}
