import { createHash } from "node:crypto";
import type { Balance, BankTransaction } from "@/lib/banking/enablebanking";

/** Orden de preferencia del saldo: contable de cierre, contable del día, disponible… */
const BALANCE_PREFERENCE = ["CLBD", "ITBD", "CLAV", "ITAV", "XPCD", "OPBD", "OPAV", "FWAV", "INFO", "OTHR"];

export function pickBalance(balances: Balance[]): { amount: number; type: string } | null {
  const eur = balances.filter((b) => !b.balance_amount.currency || b.balance_amount.currency === "EUR");
  const list = eur.length ? eur : balances;
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => {
    const ia = BALANCE_PREFERENCE.indexOf(a.balance_type);
    const ib = BALANCE_PREFERENCE.indexOf(b.balance_type);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const b = sorted[0]!;
  return { amount: Math.round(Number(b.balance_amount.amount) * 100) / 100, type: b.balance_type };
}

export type ImportedTransaction = {
  external_id: string;
  tx_date: string;
  value_date: string | null;
  amount: number;
  kind: "income" | "expense";
  description: string;
  counterparty_name: string | null;
  bank_details: string | null;
};

/**
 * Convierte un movimiento del banco al formato de RS Control.
 * Solo movimientos contabilizados (BOOK). El identificador estable evita duplicados
 * aunque el movimiento se descargue varias veces.
 */
export function mapTransaction(t: BankTransaction): ImportedTransaction | null {
  if (t.status !== "BOOK") return null;
  const raw = Number(t.transaction_amount.amount);
  if (!Number.isFinite(raw) || raw === 0) return null;
  const amount = Math.round(Math.abs(raw) * 100) / 100 * (t.credit_debit_indicator === "DBIT" ? -1 : 1);
  const date = t.booking_date ?? t.value_date ?? t.transaction_date;
  if (!date) return null;
  const counterparty = (amount > 0 ? t.debtor?.name : t.creditor?.name)?.trim() || null;
  const remittance = (t.remittance_information ?? []).map((s) => s.trim()).filter(Boolean).join(" · ");
  const description = (remittance || counterparty || (amount > 0 ? "Ingreso" : "Cargo")).slice(0, 300);
  const stable = t.entry_reference || t.transaction_id;
  const external_id = stable
    ? `ref:${stable}`
    : `h:${createHash("sha256").update([date, t.transaction_amount.amount, t.credit_debit_indicator, remittance, counterparty ?? ""].join("|")).digest("hex").slice(0, 32)}`;
  return {
    external_id,
    tx_date: date,
    value_date: t.value_date ?? null,
    amount,
    kind: amount > 0 ? "income" : "expense",
    description,
    counterparty_name: counterparty,
    bank_details: [t.reference_number, remittance].filter(Boolean).join(" · ").slice(0, 500) || null,
  };
}

export const normalizeIban = (iban?: string | null) => (iban ?? "").replace(/\s+/g, "").toUpperCase();
