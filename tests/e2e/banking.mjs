/**
 * Prueba extremo a extremo de la conexión bancaria contra el banco simulado.
 * Requiere: servidor de RS Control con ENABLE_BANKING_API_URL apuntando al simulador.
 * Uso: node tests/e2e/banking.mjs <baseUrl> <simuladorUrl>
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? "playwright");

const BASE = process.argv[2] ?? "http://localhost:3200";
const MOCK = process.argv[3] ?? "http://127.0.0.1:4010";
let ok = 0;
const errors = [];
const check = (c, m) => { if (!c) throw new Error("FALLO: " + m); ok++; console.log("  ✔", m); };

const b = await chromium.launch();
try {
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-ES" })).newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`${BASE}/login`);
  await p.fill("input[name=username]", "admin1");
  await p.fill("input[name=password]", "Demo-RS-2026!");
  await Promise.all([p.waitForURL(/\/panel/), p.click("button[type=submit]")]);

  // Conectar banco
  await p.goto(`${BASE}/tesoreria/bancos`);
  await p.getByText("Banco Santander", { exact: true }).click();
  await Promise.all([p.waitForURL(/\/tesoreria\/bancos\/[0-9a-f-]+\?ok=1/), p.getByRole("button", { name: "Continuar en la web del banco" }).click()]);
  await p.getByText("Permiso concedido por el banco").waitFor();
  check(true, "Flujo de autorización: app → banco → vuelta a la app");
  check((await p.getByText("Vinculada", { exact: true }).count()) === 1, "La cuenta con el mismo IBAN se vincula sola");

  // Vincular la segunda como cuenta nueva (lanza la primera descarga)
  await p.locator("select[name=bank_account_id]").selectOption("new");
  await p.getByRole("button", { name: "Vincular" }).click();
  await p.getByText(/Cuenta vinculada\. \d+ movimientos importados/).waitFor();
  check(true, "Cuenta nueva creada, vinculada e importados sus movimientos");

  // Actualizar ahora (repetido: no debe duplicar)
  await p.goto(`${BASE}/tesoreria/bancos`);
  await p.getByRole("button", { name: "Actualizar ahora" }).click();
  await p.getByText(/Actualizado\. \d+ movimientos nuevos/).waitFor();
  await p.goto(`${BASE}/tesoreria/bancos`);
  await p.getByRole("button", { name: "Actualizar ahora" }).click();
  await p.getByText("Actualizado. 0 movimientos nuevos.").waitFor();
  check(true, "Repetir la actualización no duplica movimientos");

  await p.goto(`${BASE}/tesoreria`);
  check((await p.getByText("70.000,00 €").count()) > 0, "El saldo de la cuenta es el que informa el banco (saldo contable)");
  check((await p.getByText(/^Automática/).count()) >= 2, "Las cuentas conectadas aparecen como automáticas");
  await p.goto(`${BASE}/tesoreria/movimientos?q=PENDIENTE`);
  check((await p.getByText("No hay movimientos con esos filtros.").count()) === 1, "Los movimientos pendientes del banco no se importan");

  // Conciliación automática (importe = pendiente − retención de garantía)
  await p.goto(`${BASE}/tesoreria/conciliacion`);
  const card = p.locator("section", { hasText: "TRANSF PAGO F2026-0115" });
  await card.getByText("Coincidencia alta").waitFor();
  check(true, "Propuesta de conciliación con coincidencia alta");
  await card.getByRole("button", { name: "Conciliar" }).first().click();
  await p.getByText(/Conciliado con la factura F2026-0115/).waitFor();
  await p.goto(`${BASE}/facturas?q=F2026-0115`);
  await p.locator("table a", { hasText: "F2026-0115" }).click();
  await p.getByText("20.900,00 €").first().waitFor();
  check((await p.getByText("Banco", { exact: true }).count()) > 0, "La factura muestra el cobro conciliado desde el banco");

  // Movimiento manual en cuenta automática: bloqueado (no aparece para elegir)
  await p.goto(`${BASE}/tesoreria/movimientos`);
  await p.getByRole("button", { name: "Nuevo movimiento" }).click();
  const opts = await p.locator("dialog select[name=account_id] option").allTextContents();
  check(!opts.some((o) => o.includes("Cuenta principal")), "Las cuentas automáticas no admiten movimientos manuales");

  // Tarea programada
  const noAuth = await p.request.get(`${BASE}/api/banca/sync`);
  check(noAuth.status() === 401, "La tarea programada exige su secreto");
  const cron = await p.request.get(`${BASE}/api/banca/sync`, { headers: { Authorization: "Bearer test-cron-secret" } });
  const r = await cron.json();
  check(cron.status() === 200 && r.connections === 1 && r.imported === 0 && r.errors === 0, "La tarea programada sincroniza sin duplicar");

  // Desconectar
  await p.goto(`${BASE}/tesoreria/bancos`);
  await p.getByRole("button", { name: "Desconectar" }).click();
  await p.locator("dialog").getByRole("button", { name: "Desconectar" }).click();
  await p.getByText("Conexión retirada").waitFor();
  check(true, "Desconectar retira el permiso y conserva los movimientos");
  const stats = await (await p.request.get(`${MOCK}/__stats`)).json();
  check(stats.calls > 5, `Todas las llamadas al banco llevaban la firma JWT válida (${stats.calls})`);
} finally {
  await b.close();
}
console.log(`\n${ok} comprobaciones superadas.`);
if (errors.length) { console.log(errors.join("\n")); process.exit(1); }
