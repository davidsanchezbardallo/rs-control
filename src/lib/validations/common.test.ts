import { describe, expect, it } from "vitest";
import { decimal, materialLines, parseDecimal } from "./common";

describe("validaciones", () => {
  it("interpreta números en formato español y punto decimal", () => {
    expect(parseDecimal("1.234,56")).toBe(1234.56);
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("12.5")).toBe(12.5);
    expect(decimal("Importe").safeParse("abc").success).toBe(false);
  });
  it("valida líneas de material", () => {
    const ok = materialLines.safeParse(JSON.stringify([{ material_id: "6f1c2a8e-0b1a-4c3e-9f00-1a2b3c4d5e6f", quantity: 3 }]));
    expect(ok.success).toBe(true);
    expect(materialLines.safeParse("[]").success).toBe(false);
    expect(materialLines.safeParse(JSON.stringify([{ material_id: "6f1c2a8e-0b1a-4c3e-9f00-1a2b3c4d5e6f", quantity: -1 }])).success).toBe(false);
    expect(materialLines.safeParse("no-json").success).toBe(false);
  });
});
