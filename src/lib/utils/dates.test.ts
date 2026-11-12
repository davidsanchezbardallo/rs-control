import { describe, expect, it } from "vitest";
import { daysFromToday, dueTone, isoDate } from "./dates";

describe("fechas", () => {
  it("formatea en hora de Madrid", () => {
    expect(isoDate(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
  it("clasifica vencimientos", () => {
    expect(dueTone(daysFromToday(-1))).toBe("danger");
    expect(dueTone(daysFromToday(10))).toBe("warning");
    expect(dueTone(daysFromToday(90))).toBe("neutral");
    expect(dueTone(null)).toBe("neutral");
  });
});
