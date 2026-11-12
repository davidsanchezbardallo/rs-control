import { describe, expect, it } from "vitest";
import { buildForecast } from "./forecast";

describe("previsión de tesorería", () => {
  it("calcula saldo final, mínimo y primera alerta", () => {
    const f = buildForecast(10000, [
      { due_date: "2026-01-10", concept: "Pago", amount: -8000, source: "payment", is_estimate: false },
      { due_date: "2026-01-05", concept: "Cobro", amount: 2000, source: "collection", is_estimate: false },
      { due_date: "2026-01-20", concept: "Nóminas", amount: -5000, source: "payroll", is_estimate: true },
      { due_date: "2026-03-30", concept: "Fuera de plazo", amount: -99999, source: "payment", is_estimate: false },
    ], "2026-01-01", 30, 1000);
    expect(f.final).toBe(-1000);
    expect(f.min).toEqual({ date: "2026-01-20", balance: -1000 });
    expect(f.inflow).toBe(2000);
    expect(f.outflow).toBe(13000);
    expect(f.firstBelow?.concept).toBe("Nóminas");
    expect(f.rows.map((r) => r.concept)).toEqual(["Cobro", "Pago", "Nóminas"]);
  });
});
