/**
 * Prueba de humo extremo a extremo (navegador real) contra el servidor local.
 * Uso: node tests/e2e/smoke.mjs [baseUrl] [carpetaCapturas]
 */
import { createRequire } from "node:module";
// Playwright viene preinstalado en el entorno; se carga con require para no añadir dependencia.
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

const browser = await chromium.launch();
try {
  // --- Sin sesión
  const anon = await browser.newPage();
  await anon.goto(`${BASE}/tesoreria`);
  check(anon.url().includes("/login"), "Sin sesión, /tesoreria redirige al login");
  await anon.fill('input[name="username"]', "admin1");
  await anon.fill('input[name="password"]', "incorrecta");
  await anon.click('button[type="submit"]');
  await anon.getByText("Usuario o contraseña incorrectos").waitFor();
  check(true, "Contraseña incorrecta: mensaje genérico");

  // --- Administración (escritorio)
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: "es-ES" });
  const a = await desk.newPage();
  watch(a);
  await login(a, "admin3");
  check(a.url().endsWith("/panel"), "Administrador entra al panel");
  await a.getByText("Saldo en cuentas").waitFor();
  await shot(a, "10-panel");
  for (const path of ["/almacen", "/almacen/solicitudes", "/almacen/movimientos", "/almacen/reposicion", "/almacen/entrada", "/almacen/salida", "/almacen/ajuste", "/almacen/devolucion"]) {
    const r = await a.goto(`${BASE}${path}`);
    check(r.status() === 200, `Admin ${path} responde 200`);
  }
  // Recorrido de TODAS las pantallas de administración (y una ficha de detalle de cada listado)
  const pages = [
    "/almacen", "/almacen/solicitudes", "/almacen/movimientos", "/almacen/reposicion", "/almacen/entrada", "/almacen/salida", "/almacen/ajuste", "/almacen/devolucion", "/almacen/materiales/nuevo",
    "/obras", "/obras/nueva", "/incidencias", "/incidencias/nueva", "/trabajadores", "/trabajadores/nuevo", "/trabajadores/calendario",
    "/vehiculos", "/vehiculos/nuevo", "/vehiculos/herramientas", "/tesoreria", "/tesoreria/movimientos", "/tesoreria/prevision?dias=90", "/tesoreria/financiacion",
    "/facturas", "/facturas/nueva", "/facturas/documentos", "/contactos", "/contactos?tipo=proveedores",
    "/informes", "/informes/almacen", "/informes/obras", "/informes/finanzas", "/informes/personal",
    "/configuracion", "/configuracion/usuarios", "/configuracion/catalogos", "/configuracion/auditoria", "/configuracion/perfil", "/buscar?q=cable",
  ];
  for (const path of pages) {
    const r = await a.goto(`${BASE}${path}`);
    if (r.status() !== 200) throw new Error(`FALLO: ${path} → ${r.status()}`);
  }
  check(true, `${pages.length} pantallas de administración cargan sin error`);
  const details = [
    ["/obras", /\/obras\/[0-9a-f-]{36}$/],
    ["/trabajadores", /\/trabajadores\/[0-9a-f-]{36}$/],
    ["/vehiculos", /\/vehiculos\/[0-9a-f-]{36}$/],
    ["/facturas", /\/facturas\/[0-9a-f-]{36}$/],
    ["/incidencias", /\/incidencias\/[0-9a-f-]{36}$/],
  ];
  for (const [list, re] of details) {
    await a.goto(`${BASE}${list}`);
    const href = await a.locator("table a").first().getAttribute("href");
    const r = await a.goto(`${BASE}${href}`);
    if (r.status() !== 200 || !re.test(new URL(a.url()).pathname)) throw new Error(`FALLO detalle ${list}`);
  }
  for (const tab of ["economico", "material", "documentos", "incidencias", "historial"]) {
    await a.goto(`${BASE}/obras`);
    const href = await a.locator("table a").first().getAttribute("href");
    const r = await a.goto(`${BASE}${href}?tab=${tab}`);
    if (r.status() !== 200) throw new Error(`FALLO pestaña obra ${tab}`);
  }
  for (const tab of ["documentos", "ausencias", "formacion", "asignaciones"]) {
    await a.goto(`${BASE}/trabajadores`);
    const href = await a.locator("table a").first().getAttribute("href");
    const r = await a.goto(`${BASE}${href}?tab=${tab}`);
    if (r.status() !== 200) throw new Error(`FALLO pestaña trabajador ${tab}`);
  }
  check(true, "Fichas de detalle y pestañas cargan sin error");
  const csv = await a.request.get(`${BASE}/api/export/stock`);
  check(csv.status() === 200 && (await csv.text()).startsWith("\uFEFFCódigo;Material"), "Exportación a Excel (CSV) del stock");

  // Tesorería: registrar un cobro de una factura pendiente
  await a.goto(`${BASE}/facturas?tipo=issued&estado=abiertas`);
  await a.locator("table a").first().click();
  await a.getByRole("button", { name: "Registrar cobro" }).click();
  await a.locator("dialog select[name=account_id]").selectOption({ index: 0 });
  await a.locator("dialog input[name=amount]").fill("100");
  await a.locator("dialog").getByRole("button", { name: "Registrar" }).click();
  await a.getByText("Cobro/pago registrado").waitFor();
  check(true, "Administración registra un cobro parcial de factura");
  await a.goto(`${BASE}/obras`);
  await a.locator("table a").first().click();
  await shot(a, "15-obra");
  await a.goto(`${BASE}/tesoreria/prevision?dias=90`);
  await shot(a, "16-prevision");
  await a.goto(`${BASE}/almacen`);
  await shot(a, "11-almacen");
  await a.click("text=Cable H07V-K 2,5 mm² marrón");
  await a.getByText("Historial de movimientos").waitFor();
  check(true, "Ficha de material con historial");
  await shot(a, "12-material");
  await a.goto(`${BASE}/almacen/solicitudes`);
  await a.locator("a", { hasText: /^SOL-/ }).first().click();
  await a.getByText("Material solicitado").waitFor();
  await shot(a, "13-solicitud");
  check(true, "Detalle de solicitud");

  // --- Trabajador (móvil)
  const phone = await browser.newContext({ ...devices["iPhone 13"], locale: "es-ES" });
  const w = await phone.newPage();
  watch(w);
  await login(w, "luis.ejemplo");
  check(w.url().endsWith("/mi"), "Trabajador entra a su app");
  await shot(w, "20-trabajador-inicio");
  await w.goto(`${BASE}/tesoreria`);
  check(w.url().endsWith("/mi"), "Trabajador que escribe /tesoreria es devuelto a /mi");
  await w.goto(`${BASE}/almacen`);
  check(w.url().endsWith("/mi"), "Trabajador no entra al almacén de administración");

  // Solicitud de material completa
  await w.goto(`${BASE}/mi/material/solicitar`);
  await w.fill('input[type="search"]', "diferencial");
  await w.getByRole("button", { name: /Diferencial 2P 40 A/ }).click();
  await w.fill('input[name="notes"], textarea[name="notes"]', "Prueba automática");
  await shot(w, "21-solicitar");
  await Promise.all([w.waitForURL(/\/mi\/material\?ok/), w.getByRole("button", { name: "Enviar solicitud" }).click()]);
  await w.getByText("Solicitud enviada").waitFor();
  check(true, "Trabajador envía una solicitud de material");

  // Salida directa
  await w.goto(`${BASE}/mi/movimientos/salida`);
  await w.fill('input[type="search"]', "bridas");
  await w.getByRole("button", { name: /Bridas negras/ }).click();
  await Promise.all([w.waitForURL(/ok=salida/), w.getByRole("button", { name: "Registrar salida" }).click()]);
  check(true, "Trabajador registra una salida de material");
  await shot(w, "22-movimientos");

  // Devolución
  await w.goto(`${BASE}/mi/movimientos/devolucion`);
  const v = await w.locator('select[name="project_id"] option', { hasText: "OB-2026-001" }).getAttribute("value");
  await w.selectOption('select[name="project_id"]', v);
  await w.getByText("Material retirado para esta obra").waitFor();
  await w.locator("button", { hasText: "Bridas negras" }).click();
  await Promise.all([w.waitForURL(/ok=devolucion/), w.getByRole("button", { name: "Registrar devolución" }).click()]);
  check(true, "Trabajador devuelve material");

  // Confirmar recepción (entrega preparada por admin)
  await w.goto(`${BASE}/mi`);
  const pend = w.getByRole("button", { name: "Confirmar que lo he recibido" });
  if (await pend.count()) {
    await pend.first().click();
    await w.waitForURL(/ok=recepcion/);
    await w.getByText("Recepción confirmada").first().waitFor();
    check(true, "Trabajador confirma recepción");
  }

  // Incidencia
  await w.goto(`${BASE}/mi/incidencias/nueva`);
  await w.fill('input[name="title"]', "Prueba automática de incidencia");
  await Promise.all([w.waitForURL(/incidencias\?ok/), w.getByRole("button", { name: "Comunicar incidencia" }).click()]);
  check(true, "Trabajador comunica una incidencia");
  await w.goto(`${BASE}/mi/perfil`);
  await shot(w, "23-perfil");

  // --- Admin ve la nueva solicitud y la entrega
  await a.goto(`${BASE}/almacen/solicitudes`);
  await a.locator("a", { hasText: /^SOL-/ }).first().click();
  await a.getByRole("button", { name: "Aprobar" }).click();
  await a.getByText("Solicitud actualizada").waitFor();
  await Promise.all([a.waitForURL(/movimientos\/.+ok=1/), a.getByRole("button", { name: "Confirmar entrega" }).click()]);
  check(true, "Administración aprueba y entrega la solicitud");
  await shot(a, "14-documento");
} finally {
  await browser.close();
}
console.log(`\n${ok} comprobaciones superadas.`);
if (errors.length) {
  console.log("Errores de consola/página:\n" + errors.join("\n"));
  process.exit(1);
}
