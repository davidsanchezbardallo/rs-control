"use client";

import { useState, useTransition } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Card } from "@/components/ui/Card";
import { LinesEditor, type FixedOption } from "./LinesEditor";
import { registerAdjustment, registerIssue, registerPurchase, registerReturn, saveMaterial } from "../actions";
import { projectMaterials } from "../search";
import { ADJUST_REASON, options } from "@/lib/labels";
import type { Option } from "@/features/lookups";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {children}
    </Card>
  );
}

export function PurchaseForm({ suppliers, today }: { suppliers: Option[]; today: string }) {
  return (
    <ActionForm action={registerPurchase} className="space-y-5">
      {(s) => (
        <>
          <Section title="Datos de la compra">
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField label="Proveedor" name="supplier_id" options={suppliers} placeholder="Sin especificar" />
              <TextField label="Nº de albarán o factura" name="reference" placeholder="ALB-0000" />
              <TextField label="Fecha" name="date" type="date" defaultValue={today} required error={s.fieldErrors?.date} />
            </div>
          </Section>
          <Section title="Materiales recibidos">
            <LinesEditor mode="purchase" error={s.fieldErrors?.lines} />
          </Section>
          <Section title="Observaciones">
            <TextAreaField label="Observaciones (opcional)" name="notes" />
          </Section>
          <div className="flex justify-end">
            <SubmitButton size="lg" pendingText="Registrando…">Confirmar entrada</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function IssueForm({ projects, employees, defaults }: { projects: Option[]; employees: Option[]; defaults?: { project_id?: string } }) {
  return (
    <ActionForm action={registerIssue} className="space-y-5">
      {(s) => (
        <>
          <Section title="Destino">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Obra" name="project_id" options={projects} placeholder="Selecciona una obra" defaultValue={defaults?.project_id} required error={s.fieldErrors?.project_id} />
              <SelectField label="Trabajador que lo recibe" name="employee_id" options={employees} placeholder="Sin trabajador concreto" />
            </div>
          </Section>
          <Section title="Material que sale de la nave">
            <LinesEditor mode="issue" error={s.fieldErrors?.lines} />
          </Section>
          <Section title="Observaciones">
            <TextAreaField label="Observaciones (opcional)" name="notes" />
          </Section>
          <div className="flex justify-end">
            <SubmitButton size="lg" pendingText="Registrando…">Confirmar salida</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

/** Devolución: al elegir la obra se carga el material retirado que se puede devolver. */
export function ReturnForm({ projects, employees, worker = false }: { projects: Option[]; employees?: Option[]; worker?: boolean }) {
  const [project, setProject] = useState("");
  const [opts, setOpts] = useState<FixedOption[] | undefined>(undefined);
  const [pending, start] = useTransition();
  return (
    <ActionForm action={registerReturn} className="space-y-5">
      {(s) => (
        <>
          <Section title={worker ? "¿De qué obra devuelves material?" : "Origen"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Obra"
                name="project_id"
                options={projects}
                placeholder="Selecciona una obra"
                value={project}
                onChange={(e) => {
                  const v = e.target.value;
                  setProject(v);
                  setOpts(undefined);
                  if (v) start(async () => setOpts(await projectMaterials(v)));
                }}
                required
                error={s.fieldErrors?.project_id}
              />
              {!worker && employees && <SelectField label="Trabajador que devuelve" name="employee_id" options={employees} placeholder="Sin trabajador concreto" />}
            </div>
          </Section>
          {project && (
            <Section title="Material devuelto a la nave">
              {pending || !opts ? <p className="text-[14px] text-muted">Cargando material…</p> : <LinesEditor key={project} mode="return" fixedOptions={opts} error={s.fieldErrors?.lines} />}
              <p className="text-[13px] text-muted">«Apto» vuelve al stock disponible. «Dañado» queda registrado como merma y no vuelve al stock.</p>
            </Section>
          )}
          <Section title="Observaciones">
            <TextAreaField label="Motivo u observaciones (opcional)" name="notes" placeholder="Ej.: sobrante de la planta baja" />
          </Section>
          <div className="flex justify-end">
            <SubmitButton size="lg" className={worker ? "w-full sm:w-auto" : undefined} pendingText="Registrando…">Registrar devolución</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function AdjustmentForm({ materials, defaultMaterial }: { materials: Option[]; defaultMaterial?: string }) {
  return (
    <ActionForm action={registerAdjustment} className="space-y-5">
      {(s) => (
        <Section title="Ajuste de inventario">
          <SelectField label="Material" name="material_id" options={materials} placeholder="Selecciona un material" defaultValue={defaultMaterial} required error={s.fieldErrors?.material_id} />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Tipo" name="direction" options={[{ value: "out", label: "Resta stock (−)" }, { value: "in", label: "Suma stock (+)" }]} required error={s.fieldErrors?.direction} />
            <TextField label="Cantidad" name="quantity" inputMode="decimal" required error={s.fieldErrors?.quantity} />
            <SelectField label="Motivo" name="reason" options={options(ADJUST_REASON)} placeholder="Elige un motivo" required error={s.fieldErrors?.reason} />
          </div>
          <TextAreaField label="Justificación" name="justification" required hint="Obligatoria: queda registrada en el historial." error={s.fieldErrors?.justification} />
          <div className="flex justify-end">
            <SubmitButton pendingText="Registrando…">Registrar ajuste</SubmitButton>
          </div>
        </Section>
      )}
    </ActionForm>
  );
}

type MaterialDefaults = Partial<Record<"id" | "code" | "name" | "description" | "category_id" | "brand" | "model_ref" | "unit_id" | "min_stock" | "default_supplier_id" | "location" | "status", string | null>>;

export function MaterialForm({ m, categories, units, suppliers }: { m?: MaterialDefaults; categories: Option[]; units: Option[]; suppliers: Option[] }) {
  const d = (k: keyof MaterialDefaults) => m?.[k] ?? undefined;
  return (
    <ActionForm action={saveMaterial}>
      {(s) => (
        <>
          {m?.id && <input type="hidden" name="id" value={m.id} />}
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Código interno" name="code" defaultValue={d("code")} required error={s.fieldErrors?.code} />
            <TextField label="Nombre" name="name" defaultValue={d("name")} required className="sm:col-span-2" error={s.fieldErrors?.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Categoría" name="category_id" options={categories} placeholder="Sin categoría" defaultValue={d("category_id")} />
            <TextField label="Marca" name="brand" defaultValue={d("brand")} />
            <TextField label="Modelo o referencia" name="model_ref" defaultValue={d("model_ref")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Unidad de medida" name="unit_id" options={units} placeholder="Elige unidad" defaultValue={d("unit_id")} required error={s.fieldErrors?.unit_id} />
            <TextField label="Stock mínimo" name="min_stock" inputMode="decimal" defaultValue={d("min_stock") ?? "0"} error={s.fieldErrors?.min_stock} />
            <TextField label="Ubicación en la nave" name="location" placeholder="Ej.: A-01" defaultValue={d("location")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Proveedor habitual" name="default_supplier_id" options={suppliers} placeholder="Sin proveedor" defaultValue={d("default_supplier_id")} />
            <SelectField label="Estado" name="status" options={[{ value: "active", label: "Activo" }, { value: "discontinued", label: "Descatalogado" }]} defaultValue={d("status") ?? "active"} />
          </div>
          <TextAreaField label="Descripción" name="description" defaultValue={d("description")} />
          <div className="flex justify-end">
            <SubmitButton>{m?.id ? "Guardar cambios" : "Crear material"}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
