"use client";

import { useMemo, useState } from "react";
import { Landmark, Link2, Pencil, RefreshCw, Search, Unlink } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { classifyTransaction, disconnectBank, linkTransaction, mapBankAccount, startBankConnection, syncNow, unlinkPayment } from "../actions";
import type { Option } from "@/features/lookups";
import { cn } from "@/lib/utils/cn";

const OUR_BANKS = ["Cajamar", "Sabadell", "Santander", "Utrera"];

/** Elegir banco (con buscador) y tipo de acceso; al enviar se abre la web del banco. */
export function ConnectBankForm({ banks }: { banks: string[] }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const ours = banks.filter((b) => OUR_BANKS.some((o) => b.toLowerCase().includes(o.toLowerCase())));
    const rest = banks.filter((b) => !ours.includes(b));
    return (t ? banks.filter((b) => b.toLowerCase().includes(t)) : [...ours, ...rest]).slice(0, 60);
  }, [banks, q]);
  return (
    <ActionForm action={startBankConnection} className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Buscar banco</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar banco…" className="h-11 w-full rounded-[var(--radius-md)] bg-surface pr-3 pl-9 text-[15px] focus:bg-canvas focus:ring-2 focus:ring-brand-500 focus:outline-none" />
      </label>
      <div role="radiogroup" aria-label="Banco" className="max-h-72 space-y-1 overflow-y-auto rounded-[var(--radius-md)] ring-1 ring-line">
        {list.map((b) => (
          <label key={b} className={cn("flex cursor-pointer items-center gap-3 px-4 py-2.5 text-[14px] hover:bg-surface", sel === b && "bg-brand-50")}>
            <input type="radio" name="aspsp" value={b} checked={sel === b} onChange={() => setSel(b)} className="accent-brand-600" />
            <Landmark className="h-4 w-4 text-subtle" aria-hidden="true" />
            {b}
          </label>
        ))}
        {!list.length && <p className="px-4 py-6 text-center text-[14px] text-muted">Sin resultados.</p>}
      </div>
      <SelectField label="Tipo de acceso en el banco" name="psu_type" options={[{ value: "business", label: "Empresa (banca de empresas)" }, { value: "personal", label: "Particular" }]} defaultValue="business" hint="Elige el mismo con el que entras normalmente en la web del banco." />
      <SubmitButton disabled={!sel} size="lg" className="w-full" pendingText="Abriendo el banco…">Continuar en la web del banco</SubmitButton>
    </ActionForm>
  );
}

export function SyncNowButton({ connectionId }: { connectionId: string }) {
  return (
    <ActionForm action={syncNow} className="space-y-2">
      <input type="hidden" name="connection_id" value={connectionId} />
      <SubmitButton variant="secondary" size="sm" icon={<RefreshCw className="h-4 w-4" />} pendingText="Actualizando…">Actualizar ahora</SubmitButton>
    </ActionForm>
  );
}

export function DisconnectButton({ connectionId }: { connectionId: string }) {
  return (
    <Dialog trigger="Desconectar" triggerVariant="ghost" triggerSize="sm" triggerIcon={<Unlink className="h-4 w-4" />} title="Desconectar el banco" description="Se retira el permiso de lectura (también en el banco). Los movimientos ya importados se conservan.">
      {() => (
        <ActionForm action={disconnectBank}>
          <input type="hidden" name="connection_id" value={connectionId} />
          <div className="flex justify-end"><SubmitButton variant="danger">Desconectar</SubmitButton></div>
        </ActionForm>
      )}
    </Dialog>
  );
}

export function MapAccountForm({ linkId, accounts }: { linkId: string; accounts: Option[] }) {
  return (
    <ActionForm action={mapBankAccount} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="link_id" value={linkId} />
      <SelectField label="Vincular con" name="bank_account_id" options={[{ value: "new", label: "Crear una cuenta nueva en RS Control" }, ...accounts]} placeholder="Elige…" className="min-w-64 flex-1" />
      <SubmitButton icon={<Link2 className="h-4 w-4" />} pendingText="Vinculando…">Vincular</SubmitButton>
    </ActionForm>
  );
}

export function LinkButton({ invoiceId, transactionId, label = "Conciliar" }: { invoiceId: string; transactionId: string; label?: string }) {
  return (
    <ActionForm action={linkTransaction} className="contents">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <input type="hidden" name="transaction_id" value={transactionId} />
      <SubmitButton size="sm" icon={<Link2 className="h-4 w-4" />} pendingText="…">{label}</SubmitButton>
    </ActionForm>
  );
}

export function ManualLinkDialog({ transactionId, invoices }: { transactionId: string; invoices: Option[] }) {
  return (
    <Dialog trigger="Otra factura" triggerVariant="ghost" triggerSize="sm" title="Conciliar con una factura" description="Si el movimiento cubre solo parte de la factura, indica el importe.">
      {() => (
        <ActionForm action={linkTransaction}>
          <input type="hidden" name="transaction_id" value={transactionId} />
          <SelectField label="Factura" name="invoice_id" options={invoices} placeholder="Elige la factura" required />
          <TextField label="Importe (opcional)" name="amount" inputMode="decimal" hint="Vacío = lo máximo posible" />
          <div className="flex justify-end"><SubmitButton>Conciliar</SubmitButton></div>
        </ActionForm>
      )}
    </Dialog>
  );
}

export function ClassifyDialog({ id, category, projectId, projects }: { id: string; category: string | null; projectId: string | null; projects: Option[] }) {
  return (
    <Dialog trigger="Clasificar" triggerVariant="ghost" triggerSize="sm" triggerIcon={<Pencil className="h-4 w-4" />} title="Clasificar movimiento" description="Para gastos sin factura (nóminas, impuestos, comisiones…). El importe del banco no se modifica.">
      {() => (
        <ActionForm action={classifyTransaction}>
          <input type="hidden" name="id" value={id} />
          <TextField label="Categoría" name="category" defaultValue={category ?? undefined} list="bank-cats" />
          <datalist id="bank-cats">
            {["Nóminas", "Seguros sociales", "Impuestos", "Combustible", "Alquiler", "Suministros", "Comisiones", "Seguros", "Préstamos", "Renting", "Material", "Otros"].map((c) => <option key={c} value={c} />)}
          </datalist>
          <SelectField label="Obra" name="project_id" options={projects} placeholder="—" defaultValue={projectId ?? undefined} />
          <div className="flex justify-end"><SubmitButton>Guardar</SubmitButton></div>
        </ActionForm>
      )}
    </Dialog>
  );
}

export function UnlinkButton({ paymentId }: { paymentId: string }) {
  return (
    <ActionForm action={unlinkPayment} className="contents">
      <input type="hidden" name="payment_id" value={paymentId} />
      <SubmitButton variant="ghost" size="sm" icon={<Unlink className="h-4 w-4" />} pendingText="…">Deshacer</SubmitButton>
    </ActionForm>
  );
}
