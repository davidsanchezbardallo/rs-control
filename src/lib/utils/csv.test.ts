import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("CSV para Excel", () => {
  it("usa BOM, punto y coma, coma decimal y escapa comillas", () => {
    const out = toCsv(["Material", "Importe"], [["Cable 2,5 mm²; \"rojo\"", 1234.5], [null, 0]]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toContain('"Cable 2,5 mm²; ""rojo"""');
    expect(out).toContain("1234,5");
  });
  it("neutraliza fórmulas", () => {
    expect(toCsv(["a"], [["=HYPERLINK(1)"]])).toContain("'=HYPERLINK(1)");
  });
});
