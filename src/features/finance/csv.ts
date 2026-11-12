/**
 * Lector de CSV de facturas (formato habitual de exportación de programas de
 * facturación como Contasimple). Admite separador ";" o "," y números en formato español.
 * Columnas reconocidas (sin distinguir mayúsculas ni tildes):
 *   número | fecha | vencimiento | cliente/proveedor/nombre | nif/cif | base imponible | iva | irpf/retención | concepto
 */
export type CsvInvoice = { number: string; issueDate: string; dueDate?: string; party: string; taxId?: string; base: number; vat: number; irpf: number; concept?: string };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === sep && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

export function parseEsNumber(v: string | undefined): number {
  if (!v) return 0;
  const s = v.replace(/[€\s]/g, "");
  const n = s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

export function parseEsDate(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const m = v.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const y = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
    return `${y}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  return undefined;
}

export function parseInvoiceCsv(text: string): { rows: CsvInvoice[]; error?: string } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], error: "El archivo no tiene datos." };
  const sep = (lines[0]!.match(/;/g)?.length ?? 0) >= (lines[0]!.match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = splitLine(lines[0]!, sep).map(norm);
  const find = (...keys: string[]) => head.findIndex((h) => keys.some((k) => h.includes(k)));
  const col = {
    number: find("numero", "n factura", "factura"),
    date: find("fecha emision", "fecha factura", "fecha"),
    due: find("vencimiento"),
    party: find("cliente", "proveedor", "nombre", "razon social"),
    tax: find("nif", "cif", "dni"),
    base: find("base"),
    vat: find("cuota iva", "iva"),
    irpf: find("irpf", "retencion"),
    concept: find("concepto", "descripcion"),
  };
  if (col.number < 0 || col.date < 0 || col.party < 0 || col.base < 0) {
    return { rows: [], error: "No se reconocen las columnas. Se necesitan al menos: número, fecha, cliente/proveedor y base imponible." };
  }
  const rows: CsvInvoice[] = [];
  for (const line of lines.slice(1)) {
    const c = splitLine(line, sep);
    const issueDate = parseEsDate(c[col.date]);
    const base = parseEsNumber(c[col.base]);
    if (!c[col.number] || !issueDate || Number.isNaN(base)) continue;
    rows.push({
      number: c[col.number]!,
      issueDate,
      dueDate: col.due >= 0 ? parseEsDate(c[col.due]) : undefined,
      party: c[col.party] || "Sin nombre",
      taxId: col.tax >= 0 ? c[col.tax] || undefined : undefined,
      base,
      vat: col.vat >= 0 ? parseEsNumber(c[col.vat]) || 0 : 0,
      irpf: col.irpf >= 0 ? Math.abs(parseEsNumber(c[col.irpf]) || 0) : 0,
      concept: col.concept >= 0 ? c[col.concept] || undefined : undefined,
    });
  }
  if (!rows.length) return { rows, error: "No se ha encontrado ninguna factura válida en el archivo." };
  return { rows };
}
