/**
 * Partes de trabajo, extremo a extremo (navegador real) contra el servidor local
 * con los datos de demostración.
 * Uso: node tests/e2e/partes.mjs [baseUrl] [carpetaCapturas]
 *
 * Trabajador (móvil): crea un parte en su obra, se rellenan solos los datos del
 * cliente, firma con el dedo, lo envía y descarga el PDF (sin importe).
 * Administración: lo revisa, pone importe, lo valida y descarga el PDF (con importe).
 * El trabajador ya no puede modificarlo.
 */
import { createRequire } from "node:module";
import { inflateSync } from "node:zlib";
const require = createRequire(import.meta.url);
const { chromium, devices } = require(process.env.PLAYWRIGHT_PATH ?? "playwright");

const BASE = process.argv[2] ?? "http://localhost:3000";
const SHOTS = process.argv[3];
const PASSWORD = "Demo-RS-2026!";
const errors = [];
let ok = 0;
const check = (cond, msg) => {
  if (!cond) throw new Error("FALLO: " + msg);
  ok++;
  console.log("  ✔", msg);
};
async function login(page, user) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', user);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login")), page.click('button[type="submit"]')]);
}
function watch(page) {
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !m.text().includes("favicon") && errors.push(`${page.url()}: ${m.text()}`));
}
const shot = async (page, name, full = true) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: full });
async function sign(page, label) {
  const canvas = page.getByLabel(`${label}: dibuja la firma`);
  await canvas.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const b = await canvas.boundingBox();
  await page.mouse.move(b.x + 20, b.y + b.height * 0.7);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(b.x + 20 + i * 18, b.y + b.height * (0.7 - Math.sin(i / 2) * 0.35), { steps: 2 });
  await page.mouse.up();
  const box = canvas.locator("xpath=..");
  await box.getByRole("button", { name: "Aceptar firma" }).click();
  await page.getByRole("img", { name: label }).waitFor();
}
/** Texto de un PDF generado con pdf-lib: descomprime los flujos y decodifica los textos <hex> Tj. */
function pdfText(buf) {
  const raw = buf.toString("latin1");
  let out = "";
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    let content;
    try {
      content = inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
    } catch {
      continue;
    }
    for (const t of content.matchAll(/<([0-9A-Fa-f]*)> Tj/g)) out += Buffer.from(t[1], "hex").toString("latin1") + "\n";
  }
  return out;
}

const browser = await chromium.launch();
try {
  // ------------------------------------------------------------ Trabajador (móvil)
  const phone = await browser.newContext({ ...devices["iPhone 13"], locale: "es-ES" });
  const w = await phone.newPage();
  watch(w);
  await login(w, "luis.ejemplo");
  await w.goto(`${BASE}/mi/partes`);
  check(await w.getByRole("link", { name: "Partes" }).first().isVisible(), "El trabajador ve «Partes» en el menú");
  await w.getByText("Nuevo parte").click();
  await w.waitForURL("**/mi/partes/nuevo");
  const opts = await w.getByLabel("Obra").locator("option").allTextContents();
  check(!opts.some((o) => o.includes("OB-2026-004")), "Solo aparecen obras activas");
  await w.getByLabel("Obra").selectOption({ label: opts.find((o) => o.includes("OB-2026-001")) });
  await w.getByText("Constructora Ejemplo SL").waitFor();
  check(await w.getByText("Calle Ejemplo 1").isVisible(), "Al elegir la obra se muestran solos el cliente y la instalación");
  check((await w.getByLabel("Razón social / persona física").count()) === 0, "El trabajador no tiene que escribir NIF, dirección… del cliente");

  // Enviar incompleto: aviso con lo que falta
  await w.getByRole("button", { name: "Enviar a administración" }).click();
  const dlg = w.getByRole("alertdialog");
  await dlg.waitFor();
  const msg = await dlg.innerText();
  check(msg.includes("tipo de trabajo") && msg.includes("orden de trabajo") && msg.includes("firma del trabajador"), "Al enviar incompleto salta un aviso con lo que falta");
  await shot(w, "42-parte-aviso", false);
  await dlg.getByRole("button", { name: "Entendido, lo completo" }).click();
  check(w.url().endsWith("/mi/partes/nuevo"), "…y el parte no se envía");

  await w.getByRole("button", { name: "Avería" }).click();
  await w.getByLabel("Trabajo 1").fill("Sustitución de diferencial en cuadro de zona común");
  await w.getByLabel("Hora inicio").fill("09:00");
  await w.getByLabel("Hora final").fill("11:30");
  check(await w.getByText("2,5 horas").first().isVisible(), "Calcula las horas (informativo)");
  await w.getByLabel("Trabajo realizado").fill("Se sustituye diferencial de 40 A y se comprueba disparo.");
  await w.getByRole("button", { name: "Básico" }).click();

  // Firma dibujada pero sin aceptar: también avisa
  const pad = w.getByLabel("Firma del trabajador: dibuja la firma");
  await pad.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const pb = await pad.boundingBox();
  await w.mouse.move(pb.x + 30, pb.y + 60);
  await w.mouse.down();
  await w.mouse.move(pb.x + 150, pb.y + 90, { steps: 5 });
  await w.mouse.up();
  await w.getByRole("button", { name: "Enviar a administración" }).click();
  await dlg.waitFor();
  check((await dlg.innerText()).includes("falta pulsar «Aceptar firma»"), "Avisa si la firma está dibujada pero sin aceptar");
  await dlg.getByRole("button", { name: "Entendido, lo completo" }).click();
  await w.getByRole("button", { name: "Borrar" }).first().click();

  await sign(w, "Firma del trabajador");
  await w.getByLabel("Nombre de quien firma por el cliente (opcional)").fill("Encargado Demo");
  await sign(w, "Firma del cliente");
  check(true, "Firma del trabajador (obligatoria) y del cliente (opcional) con el dedo");
  await shot(w, "40-parte-movil");
  await Promise.all([w.waitForURL(/\/mi\/partes\/[0-9a-f-]{36}\?ok=enviado/), w.getByRole("button", { name: "Enviar a administración" }).click()]);
  await w.getByText("Parte enviado a administración").waitFor();
  check(true, "Parte enviado a administración");
  const reportId = new URL(w.url()).pathname.split("/").pop();

  // Corregir antes de que se valide
  await w.getByLabel("Observaciones").fill("Cliente informado.");
  await w.getByRole("button", { name: "Guardar cambios" }).click();
  await w.getByText("Parte enviado a administración").waitFor();
  check((await w.getByLabel("Observaciones").inputValue()) === "Cliente informado.", "Puede corregirlo mientras no esté validado");

  const wpdf = await phone.request.get(`${BASE}/api/partes/${reportId}/pdf`);
  const wbuf = Buffer.from(await wpdf.body());
  check(wpdf.status() === 200 && wbuf.subarray(0, 4).toString() === "%PDF", "El trabajador descarga el PDF");
  const wtxt = pdfText(wbuf);
  check(wtxt.includes("PARTE TÉCNICO") && wtxt.includes("Constructora Ejemplo SL") && wtxt.includes("diferencial"), "El PDF lleva la plantilla y los datos del parte");
  check(!wtxt.includes("IMPORTE"), "El PDF del trabajador no lleva importe");

  // ------------------------------------------------------------ Administración
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-ES" });
  const a = await desk.newPage();
  watch(a);
  await login(a, "admin1");
  await a.goto(`${BASE}/partes?estado=submitted`);
  check(await a.getByText("pendientes de validar").isVisible(), "Administración ve los pendientes de validar");
  await a.goto(`${BASE}/partes/${reportId}`);
  check((await a.getByLabel("Trabajo realizado").inputValue()).includes("diferencial"), "Administración abre el parte");
  check((await a.getByRole("img", { name: "Firma del cliente" }).evaluate((i) => i.naturalWidth)) > 0, "Ve la firma del cliente");
  await a.getByLabel("Importe (IVA no incluido)").fill("185,40");
  await a.getByRole("button", { name: "Guardar importe" }).click();
  await a.getByText("Importe guardado.").waitFor();
  await a.getByRole("button", { name: "Validar parte" }).click();
  await a.getByText("Parte validado").first().waitFor();
  check(true, "Pone importe y valida");
  await shot(a, "41-parte-admin");
  const apdf = await desk.request.get(`${BASE}/api/partes/${reportId}/pdf`);
  const abuf = Buffer.from(await apdf.body());
  check(apdf.status() === 200 && pdfText(abuf).includes("IMPORTE") && pdfText(abuf).includes("185,40"), "El PDF de administración lleva el importe");
  await a.goto(`${BASE}/obras`);
  await a.getByText("Residencial Los Olivos").first().click();
  await a.getByRole("link", { name: "Partes", exact: true }).click();
  await a.waitForURL(/tab=partes/);
  await a.getByText("185,40").first().waitFor();
  check(true, "El parte aparece en la ficha de la obra (con su importe)");

  // ------------------------------------------------------------ Tras validar
  await w.goto(`${BASE}/mi/partes/${reportId}`);
  check(await w.getByText("Validado por administración").isVisible(), "El trabajador lo ve validado");
  check((await w.getByLabel("Trabajo realizado").count()) === 0, "…y ya no puede modificarlo");
  check(!(await w.content()).includes("185,40"), "El trabajador nunca ve el importe");

  // Otro trabajador no puede verlo ni descargarlo
  const other = await browser.newContext({ ...devices["iPhone 13"], locale: "es-ES" });
  const o = await other.newPage();
  await login(o, "marta.ejemplo");
  const r404 = await o.goto(`${BASE}/mi/partes/${reportId}`);
  check(r404.status() === 404, "Otro trabajador no ve el parte");
  const opdf = await other.request.get(`${BASE}/api/partes/${reportId}/pdf`);
  check(opdf.status() === 404, "…ni descarga su PDF");

  if (errors.length) throw new Error("Errores en consola:\n" + errors.join("\n"));
  console.log(`\n✔ Partes de trabajo: ${ok} comprobaciones superadas`);
} finally {
  await browser.close();
}
