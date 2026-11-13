import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { hoursBetween, workReportSchema } from "./schema";
import { buildWorkReportPdf, type PdfInput } from "./pdf/build";

/** Texto de un PDF de pdf-lib (flujos comprimidos con textos <hex> Tj). */
function pdfText(bytes: Uint8Array) {
  const raw = Buffer.from(bytes).toString("latin1");
  let out = "";
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    try {
      const c = inflateSync(Buffer.from(m[1]!, "latin1")).toString("latin1");
      for (const t of c.matchAll(/<([0-9A-Fa-f]*)> Tj/g)) out += Buffer.from(t[1]!, "hex").toString("latin1") + "\n";
    } catch {
      /* flujo no comprimido (imágenes) */
    }
  }
  return out;
}

const base: PdfInput = {
  company: { name: "Empresa Demo SL", trade_name: "Demo", tagline: "Instalaciones", tax_id: "B00000000", address: null, city: "Utrera", phone: "600000000", phone_2: null, email: "info@empresa.example" },
  report: {
    number: "PT-2026-0001", report_date: "2026-11-13", status: "submitted", work_types: ["breakdown"], maintenance_type: "basic",
    project: "OB-2026-001 · Obra demo", employee: "Técnico Demo",
    fields: { client_name: "Cliente Ejemplo SL", client_tax_id: "B00000001", site_name: "Instalación demo" },
    lines: [{ description: "Revisión del cuadro", technician_name: "Técnico Demo", start_time: "08:00:00", end_time: "10:30:00", hours: 2.5 }],
    work_done: "Sustitución de diferencial. Emoji no soportado: 🔌", observations: null, client_signer_name: "Encargado", validated_at: null,
  },
};

describe("partes de trabajo", () => {
  it("calcula horas, también cruzando medianoche", () => {
    expect(hoursBetween("08:00", "10:30")).toBe(2.5);
    expect(hoursBetween("22:00", "01:00")).toBe(3);
    expect(hoursBetween("08:00", null)).toBeNull();
  });

  it("valida el parte: obra obligatoria, email y horas", () => {
    expect(workReportSchema.safeParse({ report_date: "2026-11-13", lines: [] }).success).toBe(false);
    const ok = workReportSchema.safeParse({ project_id: "00000000-0000-4000-8000-000000000001", report_date: "2026-11-13", client_email: "", lines: [{ description: "x", start_time: "" }] });
    expect(ok.success && ok.data.client_email).toBe(null);
    expect(workReportSchema.safeParse({ project_id: "00000000-0000-4000-8000-000000000001", report_date: "2026-11-13", lines: [{ description: "x", start_time: "25:00" }] }).success).toBe(false);
  });

  it("genera el PDF con la plantilla y sin importe para el trabajador", async () => {
    const bytes = await buildWorkReportPdf(base);
    expect(Buffer.from(bytes.subarray(0, 4)).toString()).toBe("%PDF");
    const t = pdfText(bytes);
    expect(t).toContain("PARTE TÉCNICO");
    expect(t).toContain("Cliente Ejemplo SL");
    expect(t).toContain("Revisión del cuadro");
    expect(t).not.toContain("IMPORTE");
  });

  it("incluye el importe para administración y admite textos largos (varias páginas)", async () => {
    const long = Array.from({ length: 200 }, (_, i) => `Línea ${i} del trabajo realizado.`).join("\n");
    const bytes = await buildWorkReportPdf({ ...base, amount: 185.4, report: { ...base.report, work_done: long } });
    const t = pdfText(bytes);
    expect(t).toContain("IMPORTE");
    expect(t).toContain("185,40");
    expect(t).toContain("Línea 199");
    expect(t).toMatch(/Página 1 de [2-9]/);
  });
});
