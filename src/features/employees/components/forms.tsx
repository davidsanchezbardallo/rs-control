"use client";

import { useState } from "react";
import { KeyRound, Pencil, Plus, Power, UserPlus } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Dialog } from "@/components/ui/Dialog";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import { addAbsence, addPpe, addTraining, createAccount, resetPassword, saveEmployee, setAccountActive } from "../actions";
import { ABSENCE_KIND, EMPLOYEE_STATUS, options } from "@/lib/labels";
import type { Option } from "@/features/lookups";

type E = Partial<Record<"id" | "code" | "first_name" | "last_name" | "national_id" | "phone" | "email" | "job_title" | "hire_date" | "end_date" | "status" | "cost_category_id" | "notes", string | null>>;

export function EmployeeForm({ e, costCategories }: { e?: E; costCategories: Option[] }) {
  const d = (k: keyof E) => e?.[k] ?? undefined;
  return (
    <ActionForm action={saveEmployee}>
      {(s) => (
        <>
          {e?.id && <input type="hidden" name="id" value={e.id} />}
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Identificador interno" name="code" defaultValue={d("code")} placeholder="T-000" required error={s.fieldErrors?.code} />
            <TextField label="Nombre" name="first_name" defaultValue={d("first_name")} required error={s.fieldErrors?.first_name} />
            <TextField label="Apellidos" name="last_name" defaultValue={d("last_name")} required error={s.fieldErrors?.last_name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="DNI / NIE" name="national_id" defaultValue={d("national_id")} hint="Dato protegido: solo administración" error={s.fieldErrors?.national_id} />
            <TextField label="Teléfono" name="phone" type="tel" defaultValue={d("phone")} />
            <TextField label="Email" name="email" type="email" defaultValue={d("email")} error={s.fieldErrors?.email} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Puesto" name="job_title" defaultValue={d("job_title")} />
            <SelectField label="Categoría de coste" name="cost_category_id" options={costCategories} placeholder="—" defaultValue={d("cost_category_id")} hint="Coste horario por categoría, no salario" />
            <SelectField label="Estado laboral" name="status" options={options(EMPLOYEE_STATUS)} defaultValue={d("status") ?? "active"} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Fecha de incorporación" name="hire_date" type="date" defaultValue={d("hire_date")} />
            <TextField label="Fecha de baja" name="end_date" type="date" defaultValue={d("end_date")} />
          </div>
          <TextAreaField label="Notas internas (el trabajador no las ve)" name="notes" defaultValue={d("notes")} />
          <div className="flex justify-end"><SubmitButton>{e?.id ? "Guardar cambios" : "Crear ficha"}</SubmitButton></div>
        </>
      )}
    </ActionForm>
  );
}

export function EditEmployeeDialog(props: { e: E; costCategories: Option[] }) {
  return (
    <Dialog trigger="Editar" triggerIcon={<Pencil className="h-4 w-4" />} title="Editar ficha" wide>
      {() => <EmployeeForm {...props} />}
    </Dialog>
  );
}

export function AbsenceDialog({ employeeId }: { employeeId: string }) {
  return (
    <Dialog trigger="Registrar" triggerSize="sm" triggerIcon={<Plus className="h-4 w-4" />} title="Vacaciones o ausencia" description="Por protección de datos, nunca indiques diagnósticos médicos.">
      {() => (
        <ActionForm action={addAbsence} resetOnSuccess>
          {(s) => (
            <>
              <input type="hidden" name="employee_id" value={employeeId} />
              <SelectField label="Tipo" name="kind" options={options(ABSENCE_KIND)} />
              <div className="grid grid-cols-3 gap-3">
                <TextField label="Desde" name="start_date" type="date" required error={s.fieldErrors?.start_date} />
                <TextField label="Hasta" name="end_date" type="date" required error={s.fieldErrors?.end_date} />
                <TextField label="Días" name="days" inputMode="decimal" required error={s.fieldErrors?.days} />
              </div>
              <TextAreaField label="Observaciones" name="notes" />
              <div className="flex justify-end"><SubmitButton>Registrar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function TrainingDialog({ employeeId }: { employeeId: string }) {
  return (
    <Dialog trigger="Añadir" triggerSize="sm" triggerIcon={<Plus className="h-4 w-4" />} title="Formación o acreditación">
      {() => (
        <ActionForm action={addTraining} resetOnSuccess>
          {(s) => (
            <>
              <input type="hidden" name="employee_id" value={employeeId} />
              <TextField label="Formación" name="name" required placeholder="PRL 20 h, trabajos en altura…" error={s.fieldErrors?.name} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Entidad" name="provider" />
                <TextField label="Horas" name="hours" inputMode="decimal" />
                <TextField label="Realizada el" name="completed_on" type="date" />
                <TextField label="Caduca el" name="expires_on" type="date" />
              </div>
              <div className="flex justify-end"><SubmitButton>Añadir</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function PpeDialog({ employeeId, today }: { employeeId: string; today: string }) {
  return (
    <Dialog trigger="Entrega EPI" triggerSize="sm" triggerIcon={<Plus className="h-4 w-4" />} title="Entrega de EPI">
      {() => (
        <ActionForm action={addPpe} resetOnSuccess>
          {(s) => (
            <>
              <input type="hidden" name="employee_id" value={employeeId} />
              <TextField label="EPI" name="item" required placeholder="Botas S3, guantes dieléctricos…" error={s.fieldErrors?.item} />
              <div className="grid grid-cols-3 gap-3">
                <TextField label="Cantidad" name="quantity" inputMode="numeric" defaultValue="1" />
                <TextField label="Entregado el" name="delivered_on" type="date" defaultValue={today} required />
                <TextField label="Renovar el" name="next_renewal_on" type="date" />
              </div>
              <CheckboxField label="El trabajador ha firmado / confirmado la recepción" name="acknowledged" />
              <div className="flex justify-end"><SubmitButton>Registrar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

function suggestPassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = new Uint32Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("") + "7";
}

export function CreateAccountDialog({ employeeId, fullName, suggestedUsername, role = "worker" }: { employeeId?: string; fullName?: string; suggestedUsername?: string; role?: "admin" | "worker" }) {
  const [pwd, setPwd] = useState("");
  return (
    <Dialog trigger={role === "admin" ? "Nuevo administrador" : "Crear acceso a la app"} triggerVariant={role === "admin" ? "primary" : "secondary"} triggerSize="sm" triggerIcon={<UserPlus className="h-4 w-4" />} title="Crear cuenta de acceso" description="Entrega la contraseña en persona. Podrá cambiarse más adelante.">
      {() => (
        <ActionForm action={createAccount}>
          {(s) => (
            <>
              {employeeId && <input type="hidden" name="employee_id" value={employeeId} />}
              <input type="hidden" name="role" value={role} />
              <TextField label="Nombre visible" name="full_name" defaultValue={fullName} required error={s.fieldErrors?.full_name} />
              <TextField label="Usuario" name="username" defaultValue={suggestedUsername} autoCapitalize="none" required hint="Con el que entrará: nombre.apellido" error={s.fieldErrors?.username} />
              <div className="flex items-end gap-2">
                <TextField label="Contraseña inicial" name="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required className="flex-1" error={s.fieldErrors?.password} />
                <Button type="button" variant="ghost" onClick={() => setPwd(suggestPassword())}>Generar</Button>
              </div>
              <div className="flex justify-end"><SubmitButton>Crear cuenta</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function ResetPasswordDialog({ profileId }: { profileId: string }) {
  const [pwd, setPwd] = useState("");
  return (
    <Dialog trigger="Cambiar contraseña" triggerVariant="ghost" triggerSize="sm" triggerIcon={<KeyRound className="h-4 w-4" />} title="Nueva contraseña">
      {() => (
        <ActionForm action={resetPassword}>
          {(s) => (
            <>
              <input type="hidden" name="profile_id" value={profileId} />
              <div className="flex items-end gap-2">
                <TextField label="Nueva contraseña" name="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required className="flex-1" error={s.fieldErrors?.password} />
                <Button type="button" variant="ghost" onClick={() => setPwd(suggestPassword())}>Generar</Button>
              </div>
              <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function ToggleAccountButton({ profileId, active }: { profileId: string; active: boolean }) {
  return (
    <ActionForm action={setAccountActive} className="contents">
      <input type="hidden" name="profile_id" value={profileId} />
      <input type="hidden" name="active" value={String(!active)} />
      <SubmitButton variant="ghost" size="sm" icon={<Power className="h-4 w-4" />} className={active ? "text-danger" : "text-success"}>{active ? "Desactivar acceso" : "Activar acceso"}</SubmitButton>
    </ActionForm>
  );
}
