import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCurrencyRounded,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  maskIban,
} from "./format";

// Intl usa espacios especiales (U+00A0 / U+202F) antes de "€" y "%".
const norm = (s: string) => s.replace(/[  ]/g, " ");

describe("formatos españoles", () => {
  it("moneda con punto de miles y coma decimal, también con 4 cifras", () => {
    expect(norm(formatCurrency(1234.5))).toBe("1.234,50 €");
    expect(norm(formatCurrency(1234567.891))).toBe("1.234.567,89 €");
    expect(norm(formatCurrency(-45))).toBe("-45,00 €");
    expect(norm(formatCurrencyRounded(9876.6))).toBe("9.877 €");
  });

  it("números y porcentajes", () => {
    expect(formatNumber(1234.567)).toBe("1.234,57");
    expect(formatNumber(100)).toBe("100");
    expect(formatNumber(2.5, 3)).toBe("2,5");
    expect(norm(formatPercent(0.1234))).toBe("12,3 %");
  });

  it("fechas DD/MM/AAAA en hora de Madrid", () => {
    // 23:30 UTC del 31/12 ya es 01/01 en Madrid (UTC+1 en invierno)
    expect(formatDate("2026-12-31T23:30:00Z")).toBe("01/01/2027");
    expect(formatDate("2026-07-15T10:00:00Z")).toBe("15/07/2026");
    expect(formatDateTime("2026-07-15T10:00:00Z")).toBe("15/07/2026, 12:00");
  });

  it("IBAN parcialmente oculto", () => {
    expect(maskIban("ES91 2100 0418 4502 0005 1332")).toBe("ES91 •••• •••• •••• •••• 1332");
    expect(maskIban("ES1")).toBe("••••");
  });
});
