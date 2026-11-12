import { describe, expect, it } from "vitest";
import { projectProfit } from "./finance";

describe("rentabilidad de obra", () => {
  it("calcula margen, desviación y pendientes", () => {
    const p = projectProfit({
      budget_amount: 100000, estimated_cost: 70000, invoiced_base: 50000, invoiced_total: 60500,
      collected_amount: 30000, certified_amount: 0, material_cost: 20000, labor_cost: 12000,
      other_expenses: 1000, supplier_invoices_cost: 2000,
    });
    expect(p.realCost).toBe(35000);
    expect(p.margin).toBe(15000);
    expect(p.marginPct).toBeCloseTo(0.3);
    expect(p.plannedMarginPct).toBeCloseTo(0.3);
    expect(p.costDeviation).toBeCloseTo(-0.5);
    expect(p.pendingCollection).toBe(30500);
    expect(p.pendingToInvoice).toBe(50000);
  });
  it("evita divisiones por cero", () => {
    const p = projectProfit({ budget_amount: 0, estimated_cost: 0, invoiced_base: 0, invoiced_total: 0, collected_amount: 0, certified_amount: 0, material_cost: 0, labor_cost: 0, other_expenses: 0, supplier_invoices_cost: 0 });
    expect(p.marginPct).toBeNull();
    expect(p.costDeviation).toBeNull();
  });
});
