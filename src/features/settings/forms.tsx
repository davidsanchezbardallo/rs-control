"use client";

import { Pencil, Plus } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Dialog } from "@/components/ui/Dialog";
import { CheckboxField, TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { changeOwnPassword, saveCatalogItem, saveCompany } from "./actions";

type Rec = Record<string, string | number | boolean | null | undefined>;
const v = (r: Rec | undefined, k: string) => (r?.[k] === null || r?.[k] === undefined ? undefined : String(r[k]));

export function CompanyForm({ c, settings }: { c: Rec; settings: { vacation_days_per_year?: number; alert_days?: number } }) {
  return (
    <ActionForm action={saveCompany}>
      {(s) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Razón social" name="name" defaultValue={v(c, "name")} required className="sm:col-span-2" error={s.fieldErrors?.name} />
            <TextField label="CIF" name="tax_id" defaultValue={v(c, "tax_id")} />
            <TextField label="Dirección" name="address" defaultValue={v(c, "address")} className="sm:col-span-2" />
            <TextField label="Localidad" name="city" defaultValue={v(c, "city")} />
            <TextField label="Nombre comercial" name="trade_name" defaultValue={v(c, "trade_name")} hint="Cabecera de los partes de trabajo" />
            <TextField label="Lema / actividad" name="tagline" defaultValue={v(c, "tagline")} className="sm:col-span-2" hint="Ej.: Instalaciones eléctricas, CCTV y alarmas" />
            <TextField label="Teléfono" name="phone" defaultValue={v(c, "phone")} />
            <TextField label="Teléfono 2" name="phone_2" defaultValue={v(c, "phone_2")} />
            <TextField label="Email" name="email" type="email" defaultValue={v(c, "email")} error={s.fieldErrors?.email} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Días de vacaciones por año" name="vacation_days_per_year" inputMode="numeric" defaultValue={String(settings.vacation_days_per_year ?? 30)} hint="Según convenio" />
            <TextField label="Días de antelación de avisos" name="alert_days" inputMode="numeric" defaultValue={String(settings.alert_days ?? 30)} hint="ITV, seguros, caducidades" />
          </div>
          <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
        </>
      )}
    </ActionForm>
  );
}

export function CatalogDialog({ kind, item }: { kind: "category" | "unit" | "cost"; item?: Rec }) {
  const title = { category: "Categoría de material", unit: "Unidad de medida", cost: "Categoría de coste horario" }[kind];
  return (
    <Dialog trigger={item ? "Editar" : "Añadir"} triggerVariant={item ? "ghost" : "secondary"} triggerSize="sm" triggerIcon={item ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} title={title}>
      {() => (
        <ActionForm action={saveCatalogItem}>
          {(s) => (
            <>
              <input type="hidden" name="kind" value={kind} />
              {item && <input type="hidden" name="id" value={String(item.id)} />}
              {kind === "category" && (
                <div className="grid grid-cols-3 gap-3">
                  <TextField label="Nombre" name="name" defaultValue={v(item, "name")} required className="col-span-2" error={s.fieldErrors?.name} />
                  <TextField label="Orden" name="sort_order" inputMode="numeric" defaultValue={v(item, "sort_order") ?? "0"} />
                </div>
              )}
              {kind === "unit" && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <TextField label="Código" name="code" defaultValue={v(item, "code")} required error={s.fieldErrors?.code} />
                    <TextField label="Nombre" name="name" defaultValue={v(item, "name")} required className="col-span-2" />
                  </div>
                  <CheckboxField label="Admite decimales (metros, kilos…)" name="allows_decimals" defaultChecked={!!item?.allows_decimals} />
                </>
              )}
              {kind === "cost" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="Categoría" name="name" defaultValue={v(item, "name")} required error={s.fieldErrors?.name} />
                    <TextField label="Coste por hora (€)" name="hourly_cost" inputMode="decimal" defaultValue={v(item, "hourly_cost")?.replace(".", ",")} required error={s.fieldErrors?.hourly_cost} />
                  </div>
                  <p className="text-[13px] text-muted">Coste empresa medio por hora de la categoría (salario + Seguridad Social). No se guardan salarios individuales.</p>
                  {item && <CheckboxField label="Activa" name="is_active" defaultChecked={!!item.is_active} />}
                </>
              )}
              <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changeOwnPassword} resetOnSuccess>
      {(s) => (
        <>
          <TextField label="Contraseña actual" name="current" type="password" autoComplete="current-password" required error={s.fieldErrors?.current} />
          <TextField label="Nueva contraseña" name="next" type="password" autoComplete="new-password" required hint="Mínimo 10 caracteres, con letras y números" error={s.fieldErrors?.next} />
          <TextField label="Repite la nueva contraseña" name="repeat" type="password" autoComplete="new-password" required error={s.fieldErrors?.repeat} />
          <div className="flex justify-end"><SubmitButton>Cambiar contraseña</SubmitButton></div>
        </>
      )}
    </ActionForm>
  );
}
