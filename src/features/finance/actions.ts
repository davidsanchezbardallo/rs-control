"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth/session";
import { fail, formObject, friendlyError, invalid, type ActionState } from "@/lib/actions";
import { date, decimal, optDate, optDecimal, optText, optUuid, text, uuid } from "@/lib/validations/common";

const NO = "Operación reservada a administración.";
const refresh = () => {
  revalidatePath("/tesoreria", "layout");
  revalidatePath("/facturas", "layout");
  revalidatePath("/panel");
  revalidatePath("/obras", "layout");
};
const nul = <T,>(v: T | undefined) => v ?? null;

// --------------------------------------------------------------- Cuentas
export async function saveBankAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const p = z
    .object({
      name: text("Nombre", 80),
      bank_name: optText(80),
      iban: z.string().trim().toUpperCase().transform((v) => v.replace(/\s+/g, "")).pipe(z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{8,30}$/, "IBAN no válido")).optional(),
      opening_balance: decimal("Saldo inicial"),
      opening_date: date("Fecha del saldo inicial"),
      is_active: z.string().optional(),
    })
    .safeParse(raw);
  if (!p.success) return invalid(p.error);
  const row = { name: p.data.name, bank_name: nul(p.data.bank_name), iban: nul(p.data.iban), opening_balance: p.data.opening_balance, opening_date: p.data.opening_date, is_active: raw.id ? p.data.is_active === "on" : true };
  const { error } = raw.id ? await s.supabase.from("bank_accounts").update(row).eq("id", raw.id) : await s.supabase.from("bank_accounts").insert({ ...row, company_id: s.profile.companyId });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Cuenta guardada." };
}

// --------------------------------------------------------------- Movimientos
export async function addTransaction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z
    .object({
      account_id: uuid("Cuenta"),
      tx_date: date("Fecha"),
      direction: z.enum(["in", "out"]),
      amount: decimal("Importe").pipe(z.number().positive("El importe debe ser mayor que cero")),
      kind: z.enum(["income", "expense", "fee", "other"]),
      category: optText(60),
      description: text("Concepto", 200),
      client_id: optUuid,
      supplier_id: optUuid,
      project_id: optUuid,
    })
    .safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const d = p.data;
  const { error } = await s.supabase.from("financial_transactions").insert({
    company_id: s.profile.companyId, account_id: d.account_id, tx_date: d.tx_date, amount: d.direction === "in" ? d.amount : -d.amount,
    kind: d.kind, category: nul(d.category), description: d.description, client_id: nul(d.client_id), supplier_id: nul(d.supplier_id), project_id: nul(d.project_id),
  });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Movimiento registrado." };
}

export async function voidTransaction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ id: uuid(), reason: z.string().trim().min(5, "Indica el motivo") }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { count } = await s.supabase.from("invoice_payments").select("id", { count: "exact", head: true }).eq("transaction_id", p.data.id);
  if (count) return fail("Este movimiento es un cobro o pago de factura: no se puede anular desde aquí.");
  const { error } = await s.supabase.from("financial_transactions").update({ status: "void", void_reason: p.data.reason }).eq("id", p.data.id);
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Movimiento anulado (queda en el historial)." };
}

export async function transfer(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ from: uuid("Cuenta origen"), to: uuid("Cuenta destino"), date: date("Fecha"), amount: decimal("Importe").pipe(z.number().positive()), description: text("Concepto", 200) }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { error } = await s.supabase.rpc("bank_transfer", { p_from: p.data.from, p_to: p.data.to, p_date: p.data.date, p_amount: p.data.amount, p_description: p.data.description });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Transferencia registrada." };
}

// --------------------------------------------------------------- Financiación y compromisos
export async function saveLoan(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const p = z
    .object({
      lender: text("Entidad", 80), kind: z.enum(["loan", "credit_line", "leasing", "other"]), principal: decimal("Importe concedido"), outstanding: decimal("Capital pendiente / dispuesto"),
      interest_rate: optDecimal, start_date: date("Inicio"), end_date: optDate, installment_amount: optDecimal,
      payment_day: z.string().optional().transform((v) => (v ? Number(v) : undefined)).pipe(z.number().int().min(1).max(31).optional()),
      account_id: optUuid, notes: optText(500), is_active: z.string().optional(),
    })
    .safeParse(raw);
  if (!p.success) return invalid(p.error);
  const d = p.data;
  const row = { lender: d.lender, kind: d.kind, principal: d.principal, outstanding: d.outstanding, interest_rate: nul(d.interest_rate), start_date: d.start_date, end_date: nul(d.end_date), installment_amount: nul(d.installment_amount), payment_day: nul(d.payment_day), account_id: nul(d.account_id), notes: nul(d.notes), is_active: raw.id ? d.is_active === "on" : true };
  const { error } = raw.id ? await s.supabase.from("loans").update(row).eq("id", raw.id) : await s.supabase.from("loans").insert({ ...row, company_id: s.profile.companyId });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Financiación guardada." };
}

export async function saveCommitment(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const p = z
    .object({
      kind: z.enum(["rent", "insurance", "phone", "software", "renting", "utilities", "payroll", "social_security", "taxes", "other"]),
      name: text("Concepto", 120), counterparty: optText(120), amount: decimal("Importe").pipe(z.number().positive()),
      frequency: z.enum(["monthly", "quarterly", "yearly"]), day_of_month: z.string().default("1").transform(Number).pipe(z.number().int().min(1).max(31)),
      start_date: date("Inicio"), end_date: optDate, vehicle_id: optUuid, is_estimate: z.string().optional(), is_active: z.string().optional(),
    })
    .safeParse(raw);
  if (!p.success) return invalid(p.error);
  const d = p.data;
  const row = { kind: d.kind, name: d.name, counterparty: nul(d.counterparty), amount: d.amount, frequency: d.frequency, day_of_month: d.day_of_month, start_date: d.start_date, end_date: nul(d.end_date), vehicle_id: nul(d.vehicle_id), is_estimate: d.is_estimate === "on", is_active: raw.id ? d.is_active === "on" : true };
  const { error } = raw.id ? await s.supabase.from("recurring_commitments").update(row).eq("id", raw.id) : await s.supabase.from("recurring_commitments").insert({ ...row, company_id: s.profile.companyId });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Compromiso guardado." };
}

// --------------------------------------------------------------- Facturas
const invoiceSchema = z
  .object({
    direction: z.enum(["issued", "received"]),
    number: text("Número", 40),
    issue_date: date("Fecha de emisión"),
    due_date: optDate,
    client_id: optUuid,
    supplier_id: optUuid,
    project_id: optUuid,
    destination: z.enum(["project", "stock", "overhead"]).optional(),
    concept: optText(300),
    vat_regime: z.enum(["general", "reverse_charge", "exempt"]).default("general"),
    base_amount: decimal("Base imponible"),
    vat_amount: optDecimal,
    irpf_amount: optDecimal,
    guarantee_amount: optDecimal,
    guarantee_release_date: optDate,
    external_ref: optText(80),
    notes: optText(1000),
  })
  .refine((v) => (v.direction === "issued" ? !!v.client_id : !!v.supplier_id), { message: "Indica el cliente o el proveedor", path: ["client_id"] })
  .refine((v) => v.direction === "issued" || v.destination !== "project" || !!v.project_id, { message: "Indica la obra a la que se imputa", path: ["project_id"] });

export async function saveInvoice(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const raw = formObject(fd);
  const p = invoiceSchema.safeParse(raw);
  if (!p.success) return invalid(p.error);
  const d = p.data;
  const row = {
    direction: d.direction, number: d.number, issue_date: d.issue_date, due_date: nul(d.due_date),
    client_id: d.direction === "issued" ? nul(d.client_id) : null, supplier_id: d.direction === "received" ? nul(d.supplier_id) : null,
    project_id: nul(d.project_id), destination: d.direction === "received" ? (d.destination ?? "overhead") : null, concept: nul(d.concept),
    vat_regime: d.vat_regime, base_amount: d.base_amount, vat_amount: d.vat_regime === "general" ? (d.vat_amount ?? Math.round(d.base_amount * 21) / 100) : 0,
    irpf_amount: d.irpf_amount ?? 0, guarantee_amount: d.guarantee_amount ?? 0, guarantee_release_date: nul(d.guarantee_release_date),
    external_ref: nul(d.external_ref), notes: nul(d.notes),
  };
  if (raw.id) {
    const { error } = await s.supabase.from("invoices").update(row).eq("id", raw.id);
    if (error) return fail(friendlyError(error));
    refresh();
    return { ok: true, message: "Factura guardada." };
  }
  const { data, error } = await s.supabase.from("invoices").insert({ ...row, company_id: s.profile.companyId }).select("id").single();
  if (error) return fail(friendlyError(error));
  refresh();
  redirect(`/facturas/${data.id}`);
}

export async function registerPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ invoice_id: uuid(), account_id: uuid("Cuenta"), date: date("Fecha"), amount: decimal("Importe").pipe(z.number().positive()), notes: optText(200) }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { error } = await s.supabase.rpc("invoice_register_payment", { p_invoice: p.data.invoice_id, p_account: p.data.account_id, p_date: p.data.date, p_amount: p.data.amount, p_notes: p.data.notes });
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Cobro/pago registrado y reflejado en tesorería." };
}

export async function voidInvoice(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const p = z.object({ id: uuid(), reason: z.string().trim().min(5, "Indica el motivo") }).safeParse(formObject(fd));
  if (!p.success) return invalid(p.error);
  const { count } = await s.supabase.from("invoice_payments").select("id", { count: "exact", head: true }).eq("invoice_id", p.data.id);
  if (count) return fail("La factura tiene cobros o pagos registrados: no se puede anular.");
  const { error } = await s.supabase.from("invoices").update({ voided_at: new Date().toISOString(), void_reason: p.data.reason }).eq("id", p.data.id);
  if (error) return fail(friendlyError(error));
  refresh();
  return { ok: true, message: "Factura anulada (queda en el historial)." };
}

/** Importación de facturas desde CSV exportado de Contasimple u otro programa. */
export async function importInvoicesCsv(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getAdminOrNull();
  if (!s) return fail(NO);
  const file = fd.get("file") as File | null;
  const direction = fd.get("direction") === "received" ? "received" : "issued";
  if (!file || !file.size) return fail("Elige un archivo CSV.");
  if (file.size > 2 * 1024 * 1024) return fail("El archivo supera 2 MB.");
  const { parseInvoiceCsv } = await import("./csv");
  const parsed = parseInvoiceCsv(await file.text());
  if (parsed.error) return fail(parsed.error);
  const table = direction === "issued" ? "clients" : "suppliers";
  const { data: parties } = await s.supabase.from(table).select("id, name, tax_id");
  let created = 0;
  const errors: string[] = [];
  for (const r of parsed.rows) {
    let party = (parties ?? []).find((p) => (r.taxId && p.tax_id?.toUpperCase() === r.taxId.toUpperCase()) || p.name.toLowerCase() === r.party.toLowerCase());
    if (!party) {
      const { data: np } = await s.supabase.from(table).insert({ company_id: s.profile.companyId, name: r.party, tax_id: r.taxId ?? null }).select("id, name, tax_id").single();
      if (np) {
        party = np;
        parties?.push(np);
      }
    }
    if (!party) {
      errors.push(`${r.number}: no se pudo crear el ${direction === "issued" ? "cliente" : "proveedor"}`);
      continue;
    }
    const { error } = await s.supabase.from("invoices").insert({
      company_id: s.profile.companyId, direction, number: r.number, issue_date: r.issueDate, due_date: r.dueDate ?? null,
      client_id: direction === "issued" ? party.id : null, supplier_id: direction === "received" ? party.id : null,
      destination: direction === "received" ? "overhead" : null, base_amount: r.base, vat_amount: r.vat, irpf_amount: r.irpf,
      vat_regime: r.vat === 0 ? "reverse_charge" : "general", concept: r.concept ?? null, external_ref: `CSV:${r.number}`,
    });
    if (error) errors.push(`${r.number}: ${error.code === "23505" ? "ya existe" : friendlyError(error)}`);
    else created++;
  }
  refresh();
  return { ok: created > 0, message: `${created} facturas importadas.${errors.length ? ` ${errors.length} omitidas: ${errors.slice(0, 5).join("; ")}${errors.length > 5 ? "…" : ""}` : ""}` };
}
