"use client";

import { Pencil, Plus, Undo2, UserCheck, Wrench } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { addVehicleEvent, assignTool, assignVehicle, returnTool, saveTool, saveVehicle } from "../actions";
import { OWNERSHIP, VEHICLE_EVENT, VEHICLE_STATUS, options } from "@/lib/labels";
import type { Option } from "@/features/lookups";

type Rec = Record<string, string | number | boolean | null | undefined>;
const v = (r: Rec | undefined, k: string) => (r?.[k] === null || r?.[k] === undefined ? undefined : String(r[k]));

export function VehicleForm({ veh }: { veh?: Rec }) {
  return (
    <ActionForm action={saveVehicle}>
      {(s) => (
        <>
          {veh && <input type="hidden" name="id" value={String(veh.id)} />}
          <div className="grid gap-3 sm:grid-cols-4">
            <TextField label="Matrícula" name="plate" defaultValue={v(veh, "plate")} required error={s.fieldErrors?.plate} />
            <TextField label="Marca" name="brand" defaultValue={v(veh, "brand")} />
            <TextField label="Modelo" name="model" defaultValue={v(veh, "model")} />
            <SelectField label="Estado" name="status" options={options(VEHICLE_STATUS)} defaultValue={v(veh, "status") ?? "active"} />
            <SelectField label="Propiedad" name="ownership" options={options(OWNERSHIP)} defaultValue={v(veh, "ownership") ?? "owned"} />
            <TextField label="Fecha de adquisición" name="acquired_on" type="date" defaultValue={v(veh, "acquired_on")} />
            <TextField label="Kilometraje" name="odometer_km" inputMode="numeric" defaultValue={v(veh, "odometer_km")} />
            <TextField label="Próxima ITV" name="itv_due" type="date" defaultValue={v(veh, "itv_due")} />
            <TextField label="Aseguradora" name="insurance_company" defaultValue={v(veh, "insurance_company")} />
            <TextField label="Nº de póliza" name="insurance_policy" defaultValue={v(veh, "insurance_policy")} />
            <TextField label="Vencimiento del seguro" name="insurance_due" type="date" defaultValue={v(veh, "insurance_due")} />
            <TextField label="Próxima revisión" name="next_service_due" type="date" defaultValue={v(veh, "next_service_due")} />
          </div>
          <TextAreaField label="Observaciones" name="notes" defaultValue={v(veh, "notes")} />
          <div className="flex justify-end"><SubmitButton>{veh ? "Guardar cambios" : "Crear vehículo"}</SubmitButton></div>
        </>
      )}
    </ActionForm>
  );
}

export function EditVehicleDialog({ veh }: { veh: Rec }) {
  return <Dialog trigger="Editar" triggerIcon={<Pencil className="h-4 w-4" />} title="Editar vehículo" wide>{() => <VehicleForm veh={veh} />}</Dialog>;
}

export function VehicleEventDialog({ vehicleId, suppliers, today }: { vehicleId: string; suppliers: Option[]; today: string }) {
  return (
    <Dialog trigger="Registrar" triggerSize="sm" triggerIcon={<Plus className="h-4 w-4" />} title="Mantenimiento, avería o revisión">
      {() => (
        <ActionForm action={addVehicleEvent} resetOnSuccess>
          {(s) => (
            <>
              <input type="hidden" name="vehicle_id" value={vehicleId} />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Tipo" name="kind" options={options(VEHICLE_EVENT)} />
                <TextField label="Fecha" name="event_date" type="date" defaultValue={today} required />
                <TextField label="Kilómetros" name="odometer_km" inputMode="numeric" />
                <TextField label="Coste (€)" name="cost" inputMode="decimal" />
              </div>
              <TextField label="Descripción" name="description" required error={s.fieldErrors?.description} />
              <SelectField label="Taller / proveedor" name="supplier_id" options={suppliers} placeholder="—" />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Nueva fecha de ITV" name="next_itv" type="date" hint="Si se ha pasado la ITV" />
                <TextField label="Próxima revisión" name="next_service" type="date" />
              </div>
              <div className="flex justify-end"><SubmitButton>Registrar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function AssignVehicleForm({ vehicleId, employees, current }: { vehicleId: string; employees: Option[]; current?: string }) {
  return (
    <ActionForm action={assignVehicle} className="flex items-end gap-2">
      <input type="hidden" name="vehicle_id" value={vehicleId} />
      <SelectField label="Trabajador asignado" name="employee_id" options={employees} placeholder="Sin asignar" defaultValue={current} className="flex-1" />
      <SubmitButton variant="secondary" icon={<UserCheck className="h-4 w-4" />}>Asignar</SubmitButton>
    </ActionForm>
  );
}

export function ToolDialog({ t }: { t?: Rec }) {
  return (
    <Dialog trigger={t ? "Editar" : "Nueva herramienta"} triggerVariant={t ? "ghost" : "primary"} triggerSize="sm" triggerIcon={t ? <Pencil className="h-4 w-4" /> : <Wrench className="h-4 w-4" />} title="Herramienta" description="Herramientas identificables (con nº de serie). Las fungibles se gestionan como material de almacén." wide>
      {() => (
        <ActionForm action={saveTool}>
          {(s) => (
            <>
              {t && <input type="hidden" name="id" value={String(t.id)} />}
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField label="Código interno" name="code" defaultValue={v(t, "code")} required error={s.fieldErrors?.code} />
                <TextField label="Nombre" name="name" defaultValue={v(t, "name")} required className="sm:col-span-2" error={s.fieldErrors?.name} />
                <TextField label="Marca" name="brand" defaultValue={v(t, "brand")} />
                <TextField label="Modelo" name="model" defaultValue={v(t, "model")} />
                <TextField label="Nº de serie" name="serial_number" defaultValue={v(t, "serial_number")} />
                <TextField label="Fecha de compra" name="purchased_on" type="date" defaultValue={v(t, "purchased_on")} />
                <TextField label="Ubicación" name="location" defaultValue={v(t, "location") ?? "Nave"} />
              </div>
              <TextAreaField label="Observaciones" name="notes" defaultValue={v(t, "notes")} />
              <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function AssignToolDialog({ toolId, employees, projects }: { toolId: string; employees: Option[]; projects: Option[] }) {
  return (
    <Dialog trigger="Entregar" triggerVariant="secondary" triggerSize="sm" triggerIcon={<UserCheck className="h-4 w-4" />} title="Entregar herramienta">
      {() => (
        <ActionForm action={assignTool}>
          {(s) => (
            <>
              <input type="hidden" name="tool_id" value={toolId} />
              <SelectField label="Trabajador" name="employee_id" options={employees} placeholder="Selecciona" required error={s.fieldErrors?.employee_id} />
              <SelectField label="Obra" name="project_id" options={projects} placeholder="—" />
              <TextField label="Estado al entregar" name="condition" placeholder="Buen estado" />
              <div className="flex justify-end"><SubmitButton>Entregar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function ReturnToolDialog({ toolId }: { toolId: string }) {
  return (
    <Dialog trigger="Devolución" triggerVariant="ghost" triggerSize="sm" triggerIcon={<Undo2 className="h-4 w-4" />} title="Devolución de herramienta">
      {() => (
        <ActionForm action={returnTool}>
          <input type="hidden" name="tool_id" value={toolId} />
          <TextField label="Estado al devolver" name="condition" placeholder="Buen estado" />
          <SelectField label="Queda" name="status" options={[{ value: "available", label: "En nave, disponible" }, { value: "repair", label: "En reparación" }, { value: "lost", label: "Extraviada" }, { value: "retired", label: "Retirada" }]} />
          <div className="flex justify-end"><SubmitButton>Registrar</SubmitButton></div>
        </ActionForm>
      )}
    </Dialog>
  );
}
