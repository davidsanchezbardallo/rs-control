import { describe, expect, it } from "vitest";
import { parseEsDate, parseEsNumber, parseInvoiceCsv } from "./csv";

describe("importación CSV de facturas", () => {
  it("interpreta números y fechas españolas", () => {
    expect(parseEsNumber("1.234,56 €")).toBe(1234.56);
    expect(parseEsNumber("99.5")).toBe(99.5);
    expect(parseEsDate("05/03/2026")).toBe("2026-03-05");
    expect(parseEsDate("5-3-26")).toBe("2026-03-05");
  });
  it("lee un CSV con punto y coma y comillas", () => {
    const csv = "﻿Número;Fecha;Vencimiento;Cliente;NIF;Base imponible;Cuota IVA;Retención;Concepto\n" +
      'F-1;01/02/2026;03/03/2026;"Constructora Ejemplo, SL";B00000001;1.000,00;210,00;0;"Certificación 1"\n' +
      "F-2;15/02/2026;;Cliente;;500;0;;\n";
    const r = parseInvoiceCsv(csv);
    expect(r.error).toBeUndefined();
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ number: "F-1", party: "Constructora Ejemplo, SL", base: 1000, vat: 210, dueDate: "2026-03-03" });
    expect(r.rows[1]!.dueDate).toBeUndefined();
  });
  it("rechaza archivos sin las columnas mínimas", () => {
    expect(parseInvoiceCsv("a;b\n1;2").error).toBeTruthy();
  });
});
