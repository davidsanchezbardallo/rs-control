"use client";

import { Pencil, Plus, UserMinus } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { addAssignment, addBudgetItem, addExpense, endAssignment, saveEstimates, saveProject, setProjectStatus } from "../actions";
import { BUDGET_KIND, COST_CATEGORY, PROJECT_STATUS, options } from "@/lib/labels";
import type { Option } from "@/features/lookups";

type P = Partial<Record<"id" | "code" | "name" | "client_id" | "work_type" | "address" | "city" | "province" | "postal_code" | "site_contact_name" | "site_contact_phone" | "start_date" | "planned_end_date" | "actual_end_date" | "manager_employee_id" | "status" | "description" | "notes", string | null>>;
const WORK_TYPES = ["Obra nueva", "Vivienda", "Local comercial", "Reforma", "Iluminación", "CCTV y alarmas", "Telecomunicaciones", "Mantenimiento", "Otros"].map((v) => ({ value: v, label: v }));

export function ProjectForm({ p, clients, employees }: { p?: P; clients: Option[]; employees: Option[] }) {
  const d = (k: keyof P) => p?.[k] ?? undefined;
  return (
    <ActionForm action={saveProject}>
      {(s) => (
        <>
          {p?.id && <input type="hidden" name="id" value={p.id} />}
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Código" name="code" defaultValue={d("code")} placeholder="Automático (OB-AAAA-000)" />
            <TextField label="Nombre de la obra" name="name" defaultValue={d("name")} required className="sm:col-span-2" error={s.fieldErrors?.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Cliente o constructora" name="client_id" options={clients} placeholder="Sin cliente" defaultValue={d("client_id")} />
            <SelectField label="Tipo de trabajo" name="work_type" options={WORK_TYPES} placeholder="—" defaultValue={d("work_type")} />
            <SelectField label="Estado" name="status" options={options(PROJECT_STATUS)} defaultValue={d("status") ?? "budgeted"} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Dirección" name="address" defaultValue={d("address")} className="sm:col-span-2" />
            <TextField label="Localidad" name="city" defaultValue={d("city") ?? "Utrera"} />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <TextField label="Provincia" name="province" defaultValue={d("province") ?? "Sevilla"} />
            <TextField label="C.P." name="postal_code" defaultValue={d("postal_code")} inputMode="numeric" />
            <TextField label="Contacto en obra" name="site_contact_name" defaultValue={d("site_contact_name")} hint="Para los partes de trabajo" />
            <TextField label="Teléfono de contacto" name="site_contact_phone" defaultValue={d("site_contact_phone")} type="tel" />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <TextField label="Inicio" name="start_date" type="date" defaultValue={d("start_date")} />
            <TextField label="Fin previsto" name="planned_end_date" type="date" defaultValue={d("planned_end_date")} />
            <TextField label="Fin real" name="actual_end_date" type="date" defaultValue={d("actual_end_date")} />
            <SelectField label="Responsable" name="manager_employee_id" options={employees} placeholder="—" defaultValue={d("manager_employee_id")} />
          </div>
          <TextAreaField label="Descripción (visible para los trabajadores de la obra)" name="description" defaultValue={d("description")} />
          <TextAreaField label="Observaciones internas" name="notes" defaultValue={d("notes")} />
          <div className="flex justify-end">
            <SubmitButton>{p?.id ? "Guardar cambios" : "Crear obra"}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function EditProjectDialog(props: { p: P; clients: Option[]; employees: Option[] }) {
  return (
    <Dialog trigger="Editar" triggerIcon={<Pencil className="h-4 w-4" />} title="Editar obra" wide>
      {() => <ProjectForm {...props} />}
    </Dialog>
  );
}

export function StatusForm({ id, status }: { id: string; status: string }) {
  return (
    <ActionForm action={setProjectStatus} className="flex items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <SelectField label="Cambiar estado" name="status" options={options(PROJECT_STATUS)} defaultValue={status} className="flex-1" />
      <SubmitButton variant="secondary">Aplicar</SubmitButton>
    </ActionForm>
  );
}

export function AssignForm({ projectId, employees }: { projectId: string; employees: Option[] }) {
  return (
    <Dialog trigger="Asignar" triggerSize="sm" triggerIcon={<Plus className="h-4 w-4" />} title="Asignar trabajador a la obra">
      {() => (
        <ActionForm action={addAssignment} resetOnSuccess>
          {(s) => (
            <>
              <input type="hidden" name="project_id" value={projectId} />
              <SelectField label="Trabajador" name="employee_id" options={employees} placeholder="Selecciona" required error={s.fieldErrors?.employee_id} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Función" name="role_in_project" placeholder="Oficial, ayudante…" />
                <TextField label="Desde" name="start_date" type="date" />
              </div>
              <div className="flex justify-end"><SubmitButton>Asignar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function EndAssignmentButton({ id }: { id: string }) {
  return (
    <ActionForm action={endAssignment} className="contents">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" size="sm" icon={<UserMinus className="h-4 w-4" />} pendingText="…">Retirar</SubmitButton>
    </ActionForm>
  );
}

export function BudgetItemDialog({ projectId, today }: { projectId: string; today: string }) {
  return (
    <Dialog trigger="Añadir" triggerSize="sm" triggerIcon={<Plus className="h-4 w-4" />} title="Presupuesto o certificación">
      {() => (
        <ActionForm action={addBudgetItem} resetOnSuccess>
          {(s) => (
            <>
              <input type="hidden" name="project_id" value={projectId} />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Tipo" name="kind" options={options(BUDGET_KIND)} />
                <TextField label="Referencia" name="reference" placeholder="PRE-0000" />
                <TextField label="Fecha" name="item_date" type="date" defaultValue={today} required />
                <TextField label="Importe sin IVA (€)" name="amount" inputMode="decimal" required error={s.fieldErrors?.amount} />
              </div>
              <TextAreaField label="Observaciones" name="notes" />
              <div className="flex justify-end"><SubmitButton>Añadir</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function EstimatesDialog({ projectId, values }: { projectId: string; values: Record<string, number> }) {
  return (
    <Dialog trigger="Costes previstos" triggerSize="sm" triggerIcon={<Pencil className="h-4 w-4" />} title="Costes previstos por partida" description="Importes sin IVA. Sirven para calcular la desviación.">
      {() => (
        <ActionForm action={saveEstimates}>
          <input type="hidden" name="project_id" value={projectId} />
          <div className="grid grid-cols-2 gap-3">
            {options(COST_CATEGORY).map((c) => (
              <TextField key={c.value} label={c.label} name={c.value} inputMode="decimal" defaultValue={values[c.value] ? String(values[c.value]).replace(".", ",") : ""} placeholder="0" />
            ))}
          </div>
          <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
        </ActionForm>
      )}
    </Dialog>
  );
}

export function ExpenseDialog({ projectId, employees, today, defaultRate }: { projectId: string; employees: Option[]; today: string; defaultRate?: number }) {
  return (
    <Dialog trigger="Añadir gasto" triggerSize="sm" triggerIcon={<Plus className="h-4 w-4" />} title="Gasto de obra" description="El material no se registra aquí: llega solo desde el almacén.">
      {() => (
        <ActionForm action={addExpense} resetOnSuccess>
          {(s) => (
            <>
              <input type="hidden" name="project_id" value={projectId} />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Partida" name="category" options={options(COST_CATEGORY).filter((o) => o.value !== "material")} />
                <TextField label="Fecha" name="expense_date" type="date" defaultValue={today} required />
              </div>
              <TextField label="Concepto" name="description" required error={s.fieldErrors?.description} />
              <SelectField label="Trabajador (mano de obra)" name="employee_id" options={employees} placeholder="—" />
              <div className="grid grid-cols-3 gap-3">
                <TextField label="Horas" name="hours" inputMode="decimal" />
                <TextField label="€/hora" name="hourly_rate" inputMode="decimal" defaultValue={defaultRate ? String(defaultRate).replace(".", ",") : ""} />
                <TextField label="Importe (€)" name="amount" inputMode="decimal" hint="O horas × €/h" error={s.fieldErrors?.amount} />
              </div>
              <div className="flex justify-end"><SubmitButton>Añadir gasto</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}
