import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { LOGO_PNG_BASE64 } from "./logo";
import { MAINTENANCE_TYPE, WORK_TYPE } from "@/lib/labels";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";

/**
 * PDF del parte de trabajo con la estructura de la plantilla «Parte técnico» de RS.
 * Función pura (sin acceso a datos): recibe todo lo necesario y devuelve los bytes.
 */
export type PdfCompany = { name: string; trade_name: string | null; tagline: string | null; tax_id: string | null; address: string | null; city: string | null; phone: string | null; phone_2: string | null; email: string | null };
export type PdfReport = {
  number: string | null;
  report_date: string;
  status: string;
  work_types: string[];
  maintenance_type: string | null;
  project: string | null;
  employee: string | null;
  fields: Record<string, string | null>;
  lines: { description: string; technician_name: string | null; start_time: string | null; end_time: string | null; hours: number | null }[];
  work_done: string | null;
  observations: string | null;
  client_signer_name: string | null;
  validated_at: string | null;
};
export type PdfInput = {
  company: PdfCompany;
  report: PdfReport;
  /** Solo para administración. `undefined` = no se muestra el recuadro de importe. */
  amount?: number | null;
  clientSignature?: Uint8Array | null;
  companySignature?: Uint8Array | null;
};

const A4: [number, number] = [595.28, 841.89];
const M = 36; // margen
const W = A4[0] - M * 2;
const BRAND = rgb(0x28 / 255, 0x35 / 255, 0x82 / 255);
const ACCENT = rgb(0xe2 / 255, 0x07 / 255, 0x0f / 255);
const INK = rgb(0.11, 0.11, 0.12);
const MUTED = rgb(0.4, 0.4, 0.43);
const LINE = rgb(0.78, 0.79, 0.82);
const SOFT = rgb(0.94, 0.95, 0.98);

export async function buildWorkReportPdf(input: PdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { report: r, company: c } = input;
  doc.setTitle(`Parte técnico ${r.number ?? ""}`.trim());
  doc.setAuthor(c.trade_name || c.name);
  doc.setCreator("RS Control");
  doc.setProducer("RS Control");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(Uint8Array.from(atob(LOGO_PNG_BASE64), (ch) => ch.charCodeAt(0)));
  const embed = async (b?: Uint8Array | null) => {
    if (!b?.length) return null;
    try {
      return await doc.embedPng(b);
    } catch {
      return null;
    }
  };
  const [sigClient, sigCompany] = await Promise.all([embed(input.clientSignature), embed(input.companySignature)]);

  // Texto seguro para las fuentes estándar (WinAnsi): lo que no se puede escribir se sustituye.
  const charset = new Set(font.getCharacterSet());
  const safe = (s: string | null | undefined) =>
    Array.from((s ?? "").replace(/\r/g, "").replace(/[\t\u00a0\u202f]/g, " "))
      .map((ch) => (ch === "\n" || charset.has(ch.codePointAt(0)!) ? ch : "?"))
      .join("");

  let page: PDFPage = doc.addPage(A4);
  let y = A4[1] - M;
  const newPage = () => {
    page = doc.addPage(A4);
    y = A4[1] - M;
    text(`${r.number ?? "Parte técnico"} · continuación`, M, y - 9, 8, font, MUTED);
    y -= 22;
  };
  const ensure = (h: number) => {
    if (y - h < M + 14) newPage();
  };
  function text(s: string, x: number, yy: number, size: number, f: PDFFont = font, color = INK) {
    page.drawText(safe(s), { x, y: yy, size, font: f, color });
  }
  /** Divide un texto en líneas que caben en `width`. */
  const wrap = (s: string, size: number, width: number, f: PDFFont = font): string[] => {
    const out: string[] = [];
    for (const para of safe(s).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        if (!word) continue;
        const tryLine = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(tryLine, size) <= width) line = tryLine;
        else {
          if (line) out.push(line);
          // palabra más larga que la línea: se corta
          let w = word;
          while (f.widthOfTextAtSize(w, size) > width) {
            let i = w.length - 1;
            while (i > 1 && f.widthOfTextAtSize(w.slice(0, i), size) > width) i--;
            out.push(w.slice(0, i));
            w = w.slice(i);
          }
          line = w;
        }
      }
      out.push(line);
    }
    return out;
  };
  const sectionTitle = (title: string) => {
    ensure(40);
    page.drawRectangle({ x: M, y: y - 16, width: W, height: 16, color: BRAND });
    text(title, M + 6, y - 11.5, 9, bold, rgb(1, 1, 1));
    y -= 16;
  };
  const checkbox = (x: number, yy: number, on: boolean, label: string) => {
    page.drawRectangle({ x, y: yy - 1, width: 9, height: 9, borderColor: INK, borderWidth: 0.8 });
    if (on) {
      page.drawLine({ start: { x: x + 1.8, y: yy + 3.5 }, end: { x: x + 3.8, y: yy + 1 }, thickness: 1.4, color: ACCENT });
      page.drawLine({ start: { x: x + 3.8, y: yy + 1 }, end: { x: x + 7.6, y: yy + 7 }, thickness: 1.4, color: ACCENT });
    }
    text(label, x + 13, yy, 8.5, on ? bold : font);
    return x + 13 + (on ? bold : font).widthOfTextAtSize(safe(label), 8.5) + 16;
  };
  /** Tabla de pares etiqueta/valor en filas de 1 o 2 columnas. */
  const grid = (rows: [string, string | null | undefined, string?, (string | null | undefined)?][]) => {
    const h = 17;
    for (const row of rows) {
      ensure(h);
      const cols: [string, string | null | undefined][] = row.length > 2 && row[2] ? [[row[0], row[1]], [row[2]!, row[3]]] : [[row[0], row[1]]];
      const cw = W / cols.length;
      cols.forEach(([label, value], i) => {
        const x = M + i * cw;
        page.drawRectangle({ x, y: y - h, width: cw, height: h, borderColor: LINE, borderWidth: 0.6 });
        text(`${label}:`, x + 5, y - 11.5, 7.5, bold, MUTED);
        const lw = bold.widthOfTextAtSize(safe(`${label}:`), 7.5) + 9;
        const v = wrap(value ?? "", 8.5, cw - lw - 6)[0] ?? "";
        text(v, x + lw, y - 11.5, 8.5);
      });
      y -= h;
    }
  };
  const paragraphBox = (title: string, body: string | null, minLines: number) => {
    sectionTitle(title);
    const lines = wrap(body ?? "", 9, W - 12);
    const total = Math.max(lines.length, minLines);
    let i = 0;
    while (i < total) {
      const room = Math.max(1, Math.floor((y - M - 18) / 12.5));
      const chunk = Math.min(room, total - i);
      const h = chunk * 12.5 + 6;
      page.drawRectangle({ x: M, y: y - h, width: W, height: h, borderColor: LINE, borderWidth: 0.6 });
      for (let k = 0; k < chunk; k++) {
        const s = lines[i + k];
        if (s) text(s, M + 6, y - 12 - k * 12.5, 9);
      }
      y -= h;
      i += chunk;
      if (i < total) newPage();
    }
  };

  // ---------------------------------------------------------------- Cabecera
  const logoH = 52;
  const logoW = (logo.width / logo.height) * logoH;
  page.drawImage(logo, { x: M, y: y - logoH, width: logoW, height: logoH });
  const hx = M + logoW + 12;
  text(c.trade_name || c.name, hx, y - 16, 15, bold, BRAND);
  if (c.tagline) text(c.tagline, hx, y - 29, 8.5, font, MUTED);
  const contact = [c.phone && `Tel. ${c.phone}`, c.phone_2, c.email].filter(Boolean).join("  ·  ");
  if (contact) text(contact, hx, y - 41, 8, font, MUTED);
  const legal = [c.trade_name && c.name !== c.trade_name ? c.name : null, c.tax_id && `CIF ${c.tax_id}`, [c.address, c.city].filter(Boolean).join(", ")].filter(Boolean).join("  ·  ");
  if (legal) text(legal, hx, y - 51, 7.5, font, MUTED);

  // Título y número
  const tx = A4[0] - M - 170;
  page.drawRectangle({ x: tx, y: y - 52, width: 170, height: 52, color: SOFT, borderColor: BRAND, borderWidth: 1 });
  text("PARTE TÉCNICO", tx + 10, y - 17, 13, bold, BRAND);
  text(`Nº ${r.number ?? "—"}`, tx + 10, y - 31, 9, bold);
  text(`Fecha: ${formatDate(r.report_date)}`, tx + 10, y - 44, 9);
  y -= 64;
  page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 1.2, color: ACCENT });
  y -= 14;

  // Tipo de trabajo
  let cx = M;
  for (const [k, label] of Object.entries(WORK_TYPE)) cx = checkbox(cx, y - 8, r.work_types.includes(k), label.toUpperCase());
  y -= 18;
  if (r.project || r.employee) {
    text([r.project && `Obra: ${r.project}`, r.employee && `Técnico: ${r.employee}`].filter(Boolean).join("   ·   "), M, y - 8, 8.5, font, MUTED);
    y -= 16;
  }
  y -= 4;

  // ---------------------------------------------------------------- Cliente e instalación
  const f = r.fields;
  sectionTitle("DATOS DEL CLIENTE");
  grid([
    ["Razón social / Persona física", f.client_name],
    ["CIF / NIF", f.client_tax_id, "Teléfono", f.client_phone],
    ["Representante legal", f.client_legal_rep, "NIF", f.client_legal_rep_tax_id],
    ["Dirección", f.client_address],
    ["Localidad", f.client_city, "Provincia", f.client_province],
    ["C.P.", f.client_postal_code, "Email", f.client_email],
  ]);
  y -= 10;
  sectionTitle("DATOS DE LA INSTALACIÓN");
  grid([
    ["Nombre comercial", f.site_name],
    ["Contacto", f.site_contact, "Teléfono", f.site_phone],
    ["Dirección", f.site_address],
    ["Localidad", f.site_city, "Provincia", f.site_province],
    ["C.P.", f.site_postal_code],
  ]);
  y -= 10;

  // ---------------------------------------------------------------- Orden de trabajo
  sectionTitle("ORDEN DE TRABAJO");
  const colW = [W - 120 - 58 - 58, 120, 58, 58];
  const heads = ["Descripción", "Técnico", "Hora inicio", "Hora final"];
  const rowH = (cells: string[][]) => Math.max(...cells.map((l) => l.length)) * 11 + 7;
  const drawRow = (cells: string[][], head = false) => {
    const h = rowH(cells);
    ensure(h);
    let x = M;
    cells.forEach((lines, i) => {
      page.drawRectangle({ x, y: y - h, width: colW[i]!, height: h, borderColor: LINE, borderWidth: 0.6, color: head ? SOFT : undefined });
      lines.forEach((s, k) => text(s, x + 5, y - 11 - k * 11, head ? 7.5 : 8.5, head ? bold : font, head ? MUTED : INK));
      x += colW[i]!;
    });
    y -= h;
  };
  drawRow(heads.map((h) => [h]), true);
  const rows = r.lines.length ? r.lines : Array.from({ length: 3 }, () => ({ description: "", technician_name: "", start_time: "", end_time: "", hours: null }));
  for (const l of rows) {
    drawRow([wrap(l.description, 8.5, colW[0]! - 10), wrap(l.technician_name ?? "", 8.5, colW[1]! - 10), [l.start_time?.slice(0, 5) ?? ""], [l.end_time?.slice(0, 5) ?? ""]]);
  }
  const hours = r.lines.reduce((s, l) => s + (l.hours ?? 0), 0);
  if (hours > 0) {
    ensure(14);
    const t = `Total: ${formatNumber(hours)} horas`;
    text(t, A4[0] - M - bold.widthOfTextAtSize(t, 8.5) - 4, y - 11, 8.5, bold);
    y -= 14;
  }
  y -= 10;

  paragraphBox("TRABAJO REALIZADO", r.work_done, 5);
  y -= 10;
  paragraphBox("OBSERVACIONES", r.observations, 3);
  y -= 10;

  // ---------------------------------------------------------------- Mantenimiento e importe
  ensure(26);
  text("TIPO DE MANTENIMIENTO:", M, y - 10, 8.5, bold, BRAND);
  cx = M + 122;
  for (const [k, label] of Object.entries(MAINTENANCE_TYPE)) cx = checkbox(cx, y - 10, r.maintenance_type === k, label.toUpperCase());
  y -= 22;
  if (input.amount !== undefined) {
    ensure(28);
    const bw = 200;
    page.drawRectangle({ x: A4[0] - M - bw, y: y - 22, width: bw, height: 22, borderColor: BRAND, borderWidth: 1 });
    text("IMPORTE (IVA no incluido)", A4[0] - M - bw + 6, y - 14, 7.5, bold, MUTED);
    const amt = input.amount == null ? "" : formatCurrency(input.amount);
    text(amt, A4[0] - M - bold.widthOfTextAtSize(safe(amt), 10) - 6, y - 14.5, 10, bold);
    y -= 30;
  }

  // ---------------------------------------------------------------- Firmas
  ensure(110);
  const sw = (W - 20) / 2;
  const signBox = (x: number, title: string, img: PDFImage | null, name: string | null) => {
    page.drawRectangle({ x, y: y - 96, width: sw, height: 96, borderColor: LINE, borderWidth: 0.8 });
    text(title, x + 6, y - 12, 8, bold, MUTED);
    if (img) {
      const maxW = sw - 20;
      const maxH = 60;
      const s = Math.min(maxW / img.width, maxH / img.height);
      page.drawImage(img, { x: x + (sw - img.width * s) / 2, y: y - 18 - maxH + (maxH - img.height * s) / 2, width: img.width * s, height: img.height * s });
    }
    if (name) text(name, x + 6, y - 90, 8);
  };
  signBox(M, "FIRMA CLIENTE", sigClient, r.client_signer_name);
  signBox(M + sw + 20, "FIRMA EMPRESA", sigCompany, r.employee);
  y -= 104;

  // Pie en todas las páginas
  const pages = doc.getPages();
  const foot = r.status === "validated" && r.validated_at ? `Validado por administración el ${formatDate(r.validated_at)}` : r.status === "validated" ? "Validado" : r.status === "submitted" ? "Pendiente de validar" : "Borrador";
  pages.forEach((p, i) => {
    p.drawText(safe(`${r.number ?? ""} · ${foot}`), { x: M, y: 20, size: 7, font, color: MUTED });
    const pg = `Página ${i + 1} de ${pages.length}`;
    p.drawText(pg, { x: A4[0] - M - font.widthOfTextAtSize(pg, 7), y: 20, size: 7, font, color: MUTED });
  });

  return doc.save();
}
