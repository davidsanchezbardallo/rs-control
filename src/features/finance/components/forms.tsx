"use client";

import { useState } from "react";
import { ArrowLeftRight, Ban, FileUp, Pencil, Plus, Wallet } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Dialog } from "@/components/ui/Dialog";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { addTransaction, importInvoicesCsv, registerPayment, saveBankAccount, saveCommitment, saveInvoice, saveLoan, transfer, voidInvoice, voidTransaction } from "../actions";
import { COMMITMENT_KIND, FREQUENCY, INVOICE_DESTINATION, LOAN_KIND, TX_KIND, VAT_REGIME, options } from "@/lib/labels";
import type { Option } from "@/features/lookups";

type Rec = Record<string, string | number | boolean | null | undefined>;
const v = (r: Rec | undefined, k: string) => (r?.[k] === null || r?.[k] === undefined ? undefined : String(r[k]));
const money = (r: Rec | undefined, k: string) => (r?.[k] === null || r?.[k] === undefined ? undefined : String(r[k]).replace(".", ","));

export function AccountDialog({ a }: { a?: Rec }) {
  return (
    <Dialog trigger={a ? "Editar" : "Nueva cuenta"} triggerVariant={a ? "ghost" : "secondary"} triggerSize="sm" triggerIcon={a ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} title={a ? "Editar cuenta" : "Nueva cuenta bancaria"}>
      {() => (
        <ActionForm action={saveBankAccount}>
          {(s) => (
            <>
              {a && <input type="hidden" name="id" value={String(a.id)} />}
              <TextField label="Nombre de la cuenta" name="name" defaultValue={v(a, "name")} required error={s.fieldErrors?.name} />
              <TextField label="Entidad" name="bank_name" defaultValue={v(a, "bank_name")} />
              <TextField label="IBAN" name="iban" defaultValue={v(a, "iban")} autoComplete="off" error={s.fieldErrors?.iban} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Saldo inicial (€)" name="opening_balance" inputMode="decimal" defaultValue={money(a, "opening_balance") ?? "0"} required />
                <TextField label="Fecha del saldo" name="opening_date" type="date" defaultValue={v(a, "opening_date")} required />
              </div>
              {a && <CheckboxField label="Cuenta activa" name="is_active" defaultChecked={!!a.is_active} />}
              <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function TransactionDialog({ accounts, projects, clients, suppliers, today }: { accounts: Option[]; projects: Option[]; clients: Option[]; suppliers: Option[]; today: string }) {
  return (
    <Dialog trigger="Nuevo movimiento" triggerSize="sm" triggerIcon={<Plus className="h-4 w-4" />} title="Movimiento manual" description="Los cobros y pagos de facturas se registran desde la propia factura." wide>
      {() => (
        <ActionForm action={addTransaction} resetOnSuccess>
          {(s) => (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField label="Cuenta" name="account_id" options={accounts} required />
                <TextField label="Fecha" name="tx_date" type="date" defaultValue={today} required />
                <SelectField label="Sentido" name="direction" options={[{ value: "out", label: "Sale dinero (−)" }, { value: "in", label: "Entra dinero (+)" }]} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField label="Importe (€)" name="amount" inputMode="decimal" required error={s.fieldErrors?.amount} />
                <SelectField label="Tipo" name="kind" options={options(TX_KIND).filter((o) => o.value !== "transfer")} defaultValue="expense" />
                <TextField label="Categoría" name="category" placeholder="Nóminas, combustible…" list="tx-categories" />
              </div>
              <datalist id="tx-categories">
                {["Nóminas", "Seguros sociales", "Impuestos", "Combustible", "Alquiler", "Suministros", "Comisiones", "Seguros", "Material", "Otros"].map((c) => <option key={c} value={c} />)}
              </datalist>
              <TextField label="Concepto" name="description" required error={s.fieldErrors?.description} />
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField label="Obra" name="project_id" options={projects} placeholder="—" />
                <SelectField label="Cliente" name="client_id" options={clients} placeholder="—" />
                <SelectField label="Proveedor" name="supplier_id" options={suppliers} placeholder="—" />
              </div>
              <div className="flex justify-end"><SubmitButton>Registrar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function TransferDialog({ accounts, today }: { accounts: Option[]; today: string }) {
  return (
    <Dialog trigger="Transferencia" triggerVariant="ghost" triggerSize="sm" triggerIcon={<ArrowLeftRight className="h-4 w-4" />} title="Transferencia entre cuentas">
      {() => (
        <ActionForm action={transfer} resetOnSuccess>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Desde" name="from" options={accounts} required />
            <SelectField label="Hacia" name="to" options={accounts} required />
            <TextField label="Fecha" name="date" type="date" defaultValue={today} required />
            <TextField label="Importe (€)" name="amount" inputMode="decimal" required />
          </div>
          <TextField label="Concepto" name="description" defaultValue="Traspaso entre cuentas" required />
          <div className="flex justify-end"><SubmitButton>Registrar</SubmitButton></div>
        </ActionForm>
      )}
    </Dialog>
  );
}

export function VoidTransactionDialog({ id }: { id: string }) {
  return (
    <Dialog trigger="Anular" triggerVariant="ghost" triggerSize="sm" triggerIcon={<Ban className="h-4 w-4" />} title="Anular movimiento" description="No se borra: queda marcado como anulado y deja de contar en el saldo.">
      {() => (
        <ActionForm action={voidTransaction}>
          {(s) => (
            <>
              <input type="hidden" name="id" value={id} />
              <TextAreaField label="Motivo" name="reason" required error={s.fieldErrors?.reason} />
              <div className="flex justify-end"><SubmitButton variant="danger">Anular</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function LoanDialog({ l, accounts }: { l?: Rec; accounts: Option[] }) {
  return (
    <Dialog trigger={l ? "Editar" : "Nueva financiación"} triggerVariant={l ? "ghost" : "secondary"} triggerSize="sm" triggerIcon={l ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} title="Préstamo, póliza o leasing" wide>
      {() => (
        <ActionForm action={saveLoan}>
          {(s) => (
            <>
              {l && <input type="hidden" name="id" value={String(l.id)} />}
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField label="Entidad" name="lender" defaultValue={v(l, "lender")} required error={s.fieldErrors?.lender} />
                <SelectField label="Tipo" name="kind" options={options(LOAN_KIND)} defaultValue={v(l, "kind")} />
                <SelectField label="Cuenta de cargo" name="account_id" options={accounts} placeholder="—" defaultValue={v(l, "account_id")} />
                <TextField label="Importe concedido (€)" name="principal" inputMode="decimal" defaultValue={money(l, "principal")} required />
                <TextField label="Capital pendiente o dispuesto (€)" name="outstanding" inputMode="decimal" defaultValue={money(l, "outstanding")} required />
                <TextField label="Tipo de interés (%)" name="interest_rate" inputMode="decimal" defaultValue={money(l, "interest_rate")} />
                <TextField label="Inicio" name="start_date" type="date" defaultValue={v(l, "start_date")} required />
                <TextField label="Vencimiento" name="end_date" type="date" defaultValue={v(l, "end_date")} />
                <TextField label="Cuota (€)" name="installment_amount" inputMode="decimal" defaultValue={money(l, "installment_amount")} />
                <TextField label="Día de pago" name="payment_day" inputMode="numeric" defaultValue={v(l, "payment_day")} />
              </div>
              <TextAreaField label="Observaciones" name="notes" defaultValue={v(l, "notes")} />
              {l && <CheckboxField label="Activo" name="is_active" defaultChecked={!!l.is_active} />}
              <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function CommitmentDialog({ c, vehicles, today }: { c?: Rec; vehicles: Option[]; today: string }) {
  return (
    <Dialog trigger={c ? "Editar" : "Nuevo compromiso"} triggerVariant={c ? "ghost" : "secondary"} triggerSize="sm" triggerIcon={c ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} title="Gasto recurrente o compromiso" description="Alquileres, seguros, renting, nóminas (importe agregado), Seguridad Social, impuestos…" wide>
      {() => (
        <ActionForm action={saveCommitment}>
          {(s) => (
            <>
              {c && <input type="hidden" name="id" value={String(c.id)} />}
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField label="Tipo" name="kind" options={options(COMMITMENT_KIND)} defaultValue={v(c, "kind")} />
                <TextField label="Concepto" name="name" defaultValue={v(c, "name")} required className="sm:col-span-2" error={s.fieldErrors?.name} />
                <TextField label="Entidad / contraparte" name="counterparty" defaultValue={v(c, "counterparty")} />
                <TextField label="Importe (€)" name="amount" inputMode="decimal" defaultValue={money(c, "amount")} required error={s.fieldErrors?.amount} />
                <SelectField label="Periodicidad" name="frequency" options={options(FREQUENCY)} defaultValue={v(c, "frequency") ?? "monthly"} />
                <TextField label="Día de cargo" name="day_of_month" inputMode="numeric" defaultValue={v(c, "day_of_month") ?? "1"} />
                <TextField label="Desde" name="start_date" type="date" defaultValue={v(c, "start_date") ?? today} required />
                <TextField label="Hasta" name="end_date" type="date" defaultValue={v(c, "end_date")} />
                <SelectField label="Vehículo (renting)" name="vehicle_id" options={vehicles} placeholder="—" defaultValue={v(c, "vehicle_id")} />
              </div>
              <CheckboxField label="Importe estimado (no confirmado)" name="is_estimate" defaultChecked={!!c?.is_estimate} />
              {c && <CheckboxField label="Activo" name="is_active" defaultChecked={!!c.is_active} />}
              <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function InvoiceForm({ inv, clients, suppliers, projects, defaults }: { inv?: Rec; clients: Option[]; suppliers: Option[]; projects: Option[]; defaults?: { direction?: string; project_id?: string; today: string } }) {
  const [direction, setDirection] = useState(v(inv, "direction") ?? defaults?.direction ?? "issued");
  const [regime, setRegime] = useState(v(inv, "vat_regime") ?? "general");
  return (
    <ActionForm action={saveInvoice}>
      {(s) => (
        <>
          {inv && <input type="hidden" name="id" value={String(inv.id)} />}
          <div className="grid gap-3 sm:grid-cols-4">
            <SelectField label="Tipo" name="direction" options={[{ value: "issued", label: "Emitida (a cliente)" }, { value: "received", label: "Recibida (de proveedor)" }]} value={direction} onChange={(e) => setDirection(e.target.value)} />
            <TextField label="Número" name="number" defaultValue={v(inv, "number")} required error={s.fieldErrors?.number} />
            <TextField label="Fecha de emisión" name="issue_date" type="date" defaultValue={v(inv, "issue_date") ?? defaults?.today} required />
            <TextField label="Vencimiento" name="due_date" type="date" defaultValue={v(inv, "due_date")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {direction === "issued" ? (
              <SelectField label="Cliente" name="client_id" options={clients} placeholder="Selecciona" defaultValue={v(inv, "client_id")} required error={s.fieldErrors?.client_id} />
            ) : (
              <SelectField label="Proveedor" name="supplier_id" options={suppliers} placeholder="Selecciona" defaultValue={v(inv, "supplier_id")} required error={s.fieldErrors?.client_id} />
            )}
            <SelectField label="Obra" name="project_id" options={projects} placeholder="Sin obra" defaultValue={v(inv, "project_id") ?? defaults?.project_id} error={s.fieldErrors?.project_id} />
            {direction === "received" ? (
              <SelectField label="Destino del gasto" name="destination" options={options(INVOICE_DESTINATION)} defaultValue={v(inv, "destination") ?? "overhead"} hint="«Almacén»: no suma a la obra (lo hará el consumo)" />
            ) : (
              <TextField label="Ref. Contasimple" name="external_ref" defaultValue={v(inv, "external_ref")} />
            )}
          </div>
          <TextField label="Concepto" name="concept" defaultValue={v(inv, "concept")} />
          <div className="grid gap-3 sm:grid-cols-4">
            <SelectField label="Régimen de IVA" name="vat_regime" options={options(VAT_REGIME)} value={regime} onChange={(e) => setRegime(e.target.value)} />
            <TextField label="Base imponible (€)" name="base_amount" inputMode="decimal" defaultValue={money(inv, "base_amount")} required error={s.fieldErrors?.base_amount} />
            <TextField label="IVA (€)" name="vat_amount" inputMode="decimal" defaultValue={money(inv, "vat_amount")} disabled={regime !== "general"} hint={regime === "general" ? "Vacío = 21 %" : "Sin IVA"} />
            <TextField label="Retención IRPF (€)" name="irpf_amount" inputMode="decimal" defaultValue={money(inv, "irpf_amount")} />
          </div>
          {direction === "issued" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Retención de garantía (€)" name="guarantee_amount" inputMode="decimal" defaultValue={money(inv, "guarantee_amount")} hint="La que retiene la constructora" />
              <TextField label="Fecha prevista de liberación" name="guarantee_release_date" type="date" defaultValue={v(inv, "guarantee_release_date")} />
            </div>
          )}
          <TextAreaField label="Observaciones" name="notes" defaultValue={v(inv, "notes")} />
          <div className="flex justify-end"><SubmitButton>{inv ? "Guardar cambios" : "Registrar factura"}</SubmitButton></div>
        </>
      )}
    </ActionForm>
  );
}

export function EditInvoiceDialog(props: React.ComponentProps<typeof InvoiceForm>) {
  return (
    <Dialog trigger="Editar" triggerIcon={<Pencil className="h-4 w-4" />} title="Editar factura" wide>
      {() => <InvoiceForm {...props} />}
    </Dialog>
  );
}

export function PaymentDialog({ invoiceId, issued, outstanding, accounts, today }: { invoiceId: string; issued: boolean; outstanding: number; accounts: Option[]; today: string }) {
  return (
    <Dialog trigger={issued ? "Registrar cobro" : "Registrar pago"} triggerIcon={<Wallet className="h-4 w-4" />} title={issued ? "Registrar cobro" : "Registrar pago"} description="Para cuentas manuales. Si la cuenta está conectada al banco, usa «Buscar en el banco»: el movimiento ya se habrá importado.">
      {() => (
        <ActionForm action={registerPayment}>
          {(s) => (
            <>
              <input type="hidden" name="invoice_id" value={invoiceId} />
              <SelectField label="Cuenta" name="account_id" options={accounts} required />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Fecha" name="date" type="date" defaultValue={today} required />
                <TextField label="Importe (€)" name="amount" inputMode="decimal" defaultValue={String(outstanding.toFixed(2)).replace(".", ",")} required error={s.fieldErrors?.amount} hint="Admite pagos parciales" />
              </div>
              <TextField label="Concepto (opcional)" name="notes" />
              <div className="flex justify-end"><SubmitButton>Registrar</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function VoidInvoiceDialog({ id }: { id: string }) {
  return (
    <Dialog trigger="Anular" triggerVariant="ghost" triggerIcon={<Ban className="h-4 w-4" />} title="Anular factura" description="La factura no se borra: queda anulada con su motivo. En Contasimple deberás emitir la rectificativa que corresponda.">
      {() => (
        <ActionForm action={voidInvoice}>
          {(s) => (
            <>
              <input type="hidden" name="id" value={id} />
              <TextAreaField label="Motivo" name="reason" required error={s.fieldErrors?.reason} />
              <div className="flex justify-end"><SubmitButton variant="danger">Anular factura</SubmitButton></div>
            </>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
}

export function ImportCsvDialog() {
  return (
    <Dialog trigger="Importar CSV" triggerVariant="ghost" triggerIcon={<FileUp className="h-4 w-4" />} title="Importar facturas desde CSV" description="Exporta el listado de facturas desde Contasimple (u otro programa) en CSV. Se crean clientes y proveedores que no existan.">
      {() => (
        <ActionForm action={importInvoicesCsv}>
          <SelectField label="Tipo de facturas" name="direction" options={[{ value: "issued", label: "Emitidas (ventas)" }, { value: "received", label: "Recibidas (compras)" }]} />
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Archivo CSV</span>
            <input name="file" type="file" accept=".csv,text/csv" required className="block w-full text-[14px] file:mr-3 file:h-10 file:rounded-[var(--radius-md)] file:border-0 file:bg-surface file:px-4 file:font-medium" />
          </label>
          <p className="text-[13px] text-muted">Columnas reconocidas: número, fecha, vencimiento, cliente/proveedor, NIF, base imponible, IVA, retención, concepto. Las facturas ya existentes se omiten.</p>
          <div className="flex justify-end"><SubmitButton pendingText="Importando…">Importar</SubmitButton></div>
        </ActionForm>
      )}
    </Dialog>
  );
}
