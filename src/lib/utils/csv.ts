/**
 * Genera CSV compatible con Excel en español:
 *  - BOM UTF-8 (tildes y "ñ" correctas al abrir con doble clic)
 *  - separador ";" y decimales con coma
 */
export type CsvValue = string | number | null | undefined;

function cell(v: CsvValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.round(v * 10000) / 10000).replace(".", ",") : "";
  let s = String(v);
  // Evita la inyección de fórmulas al abrir en Excel
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  return "﻿" + [headers, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
