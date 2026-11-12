import { describe, expect, it } from "vitest";
import { can } from "./roles";

describe("permisos por rol", () => {
  it("el trabajador no accede a datos económicos ni confidenciales", () => {
    for (const p of [
      "finance.view",
      "invoices.view",
      "inventory.view_costs",
      "projects.view_finance",
      "employees.view_all",
      "employees.view_sensitive",
      "settings.manage",
      "dashboard.company",
    ] as const) {
      expect(can("worker", p)).toBe(false);
    }
  });
  it("el trabajador puede solicitar material y ver sus obras", () => {
    expect(can("worker", "inventory.request")).toBe(true);
    expect(can("worker", "projects.view_assigned")).toBe(true);
  });
  it("el administrador tiene acceso completo", () => {
    expect(can("admin", "finance.manage")).toBe(true);
    expect(can("admin", "users.manage")).toBe(true);
  });
});
