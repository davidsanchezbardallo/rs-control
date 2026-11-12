import { describe, expect, it } from "vitest";
import { ilikeAny } from "./search";

describe("ilikeAny", () => {
  it("neutraliza caracteres de la sintaxis de filtros", () => {
    expect(ilikeAny(["name"], "cable),id.eq.1")).toBe("name.ilike.%cable  id eq 1%");
    expect(ilikeAny(["name", "code"], "cab")).toBe("name.ilike.%cab%,code.ilike.%cab%");
  });
});
