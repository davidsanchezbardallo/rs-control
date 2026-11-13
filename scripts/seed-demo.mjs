/**
 * RS CONTROL · Datos de demostración FICTICIOS para el entorno LOCAL.
 *
 * Crea usuarios de prueba y ejecuta operaciones reales (compras, solicitudes,
 * entregas, devoluciones, facturas, cobros…) a través de la API con la sesión
 * de cada usuario, de modo que también comprueba permisos y reglas.
 *
 * Uso:  npm run db:demo        (tras `npx supabase db reset`)
 * NUNCA ejecutar contra producción: se niega si la URL no es local.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const DOMAIN = process.env.USERNAME_EMAIL_DOMAIN ?? "usuarios.rscontrol.invalid";
const COMPANY = "00000000-0000-4000-8000-000000000001";
const PASSWORD = "Demo-RS-2026!"; // contraseña SOLO de demostración local

if (!URL || !/127\.0\.0\.1|localhost/.test(URL)) {
  console.error("Este script solo puede ejecutarse contra Supabase local.");
  process.exit(1);
}

const admin = createClient(URL, SECRET, { auth: { persistSession: false } });

// Espera a que la autenticación local esté lista (tras `supabase db reset` tarda unos segundos)
for (let i = 0; i < 60; i++) {
  const ok = await fetch(`${URL}/auth/v1/health`).then((r) => r.ok, () => false);
  if (ok) break;
  await new Promise((r) => setTimeout(r, 1000));
}

function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function signIn(username) {
  const c = createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });
  must(await c.auth.signInWithPassword({ email: `${username}@${DOMAIN}`, password: PASSWORD }), `login ${username}`);
  return c;
}

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => iso(new Date(today.getTime() + n * 86400000));

// ---------------------------------------------------------------------------
console.log("· Trabajadores y usuarios");
const cats = must(await admin.from("labor_cost_categories").select("id,name"), "categorías");
const cat = Object.fromEntries(cats.map((c) => [c.name, c.id]));

const workers = [
  { code: "T-001", first_name: "Luis", last_name: "Ejemplo Uno", job_title: "Oficial electricista", cost: "Oficial 1ª", username: "luis.ejemplo" },
  { code: "T-002", first_name: "Marta", last_name: "Ejemplo Dos", job_title: "Oficial electricista", cost: "Oficial 1ª", username: "marta.ejemplo" },
  { code: "T-003", first_name: "Rafael", last_name: "Ejemplo Tres", job_title: "Técnico CCTV y alarmas", cost: "Oficial 2ª", username: "rafael.ejemplo" },
  { code: "T-004", first_name: "Pablo", last_name: "Ejemplo Cuatro", job_title: "Ayudante", cost: "Ayudante", username: "pablo.ejemplo" },
];
const employees = must(
  await admin
    .from("employees")
    .insert(
      workers.map((w, i) => ({
        company_id: COMPANY,
        code: w.code,
        first_name: w.first_name,
        last_name: w.last_name,
        job_title: w.job_title,
        cost_category_id: cat[w.cost],
        national_id: `0000000${i}X`,
        phone: `600 000 00${i}`,
        hire_date: addDays(-400 + i * 30),
      })),
    )
    .select("id,code"),
  "empleados",
);
const empByCode = Object.fromEntries(employees.map((e) => [e.code, e.id]));

const accounts = [
  { username: "admin1", full_name: "Administrador 1 (demo)", role: "admin" },
  { username: "admin2", full_name: "Administrador 2 (demo)", role: "admin" },
  { username: "admin3", full_name: "Administración (demo)", role: "admin" },
  ...workers.map((w) => ({ username: w.username, full_name: `${w.first_name} ${w.last_name}`, role: "worker", employee_id: empByCode[w.code] })),
];
for (const a of accounts) {
  const { user } = must(
    await admin.auth.admin.createUser({ email: `${a.username}@${DOMAIN}`, password: PASSWORD, email_confirm: true }),
    `usuario ${a.username}`,
  );
  must(
    await admin.from("profiles").insert({
      id: user.id,
      company_id: COMPANY,
      role: a.role,
      username: a.username,
      full_name: a.full_name,
      employee_id: a.employee_id ?? null,
    }),
    `perfil ${a.username}`,
  );
}

const A = await signIn("admin3");
const W1 = await signIn("luis.ejemplo");
const W2 = await signIn("marta.ejemplo");
const W3 = await signIn("rafael.ejemplo");

// ---------------------------------------------------------------------------
console.log("· Clientes, proveedores y obras");
const clients = must(
  await A.from("clients")
    .insert([
      { kind: "company", name: "Constructora Ejemplo SL", tax_id: "B00000001", address: "Avenida Ficticia 100", city: "Sevilla", province: "Sevilla", postal_code: "41000", legal_rep_name: "Representante Demo", legal_rep_tax_id: "00000000T", phone: "600000000", email: "obras@constructora.example" },
      { kind: "company", name: "Promotora Ficticia SA", tax_id: "A00000002", city: "Dos Hermanas" },
      { kind: "community", name: "C. P. Residencial Demo", tax_id: "H00000003", city: "Utrera" },
      { kind: "individual", name: "Cliente particular (demo)", city: "Utrera" },
    ], { defaultToNull: false })
    .select("id,name"),
  "clientes",
);
const suppliers = must(
  await A.from("suppliers")
    .insert([
      { name: "Suministros Eléctricos Demo SL", tax_id: "B00000010", payment_terms_days: 60 },
      { name: "Distribuidora Ficticia de Material SA", tax_id: "A00000011", payment_terms_days: 30 },
      { name: "Seguridad Ejemplo SL", tax_id: "B00000012", payment_terms_days: 30 },
    ], { defaultToNull: false })
    .select("id,name"),
  "proveedores",
);

const projectRows = [
  { code: "OB-2026-001", name: "Residencial Los Olivos · 24 viviendas", client_id: clients[0].id, work_type: "Obra nueva", address: "Calle Ejemplo 1", city: "Utrera", postal_code: "41710", site_contact_name: "Encargado Demo", site_contact_phone: "600000001", status: "in_progress", start_date: addDays(-120), planned_end_date: addDays(90), manager_employee_id: empByCode["T-001"] },
  { code: "OB-2026-002", name: "Nave logística Demo", client_id: clients[1].id, work_type: "Obra nueva", address: "Polígono Ficticio, parcela 7", city: "Dos Hermanas", status: "in_progress", start_date: addDays(-60), planned_end_date: addDays(150) },
  { code: "OB-2026-003", name: "CCTV y alarma comunidad", client_id: clients[2].id, work_type: "CCTV y alarmas", address: "Avenida Demo 12", city: "Utrera", status: "preparation", start_date: addDays(7), planned_end_date: addDays(40) },
  { code: "OB-2026-004", name: "Reforma eléctrica vivienda", client_id: clients[3].id, work_type: "Reforma", address: "Calle Ficticia 3", city: "Utrera", status: "in_progress", start_date: addDays(-90), planned_end_date: addDays(-30) },
];
const projects = must(await A.from("projects").insert(projectRows).select("id,code"), "obras");
const prj = Object.fromEntries(projects.map((p) => [p.code, p.id]));

must(
  await A.from("project_budget_items").insert([
    { project_id: prj["OB-2026-001"], kind: "initial", reference: "PRE-0101", amount: 186000 },
    { project_id: prj["OB-2026-001"], kind: "additional", reference: "PRE-0101-A1", amount: 9400 },
    { project_id: prj["OB-2026-001"], kind: "certification", reference: "CERT-1", amount: 52000 },
    { project_id: prj["OB-2026-002"], kind: "initial", reference: "PRE-0102", amount: 98500 },
    { project_id: prj["OB-2026-003"], kind: "initial", reference: "PRE-0103", amount: 14200 },
    { project_id: prj["OB-2026-004"], kind: "initial", reference: "PRE-0104", amount: 7800 },
  ], { defaultToNull: false }),
  "presupuestos",
);
must(
  await A.from("project_cost_estimates").insert([
    { project_id: prj["OB-2026-001"], category: "material", amount: 62000 },
    { project_id: prj["OB-2026-001"], category: "labor", amount: 71000 },
    { project_id: prj["OB-2026-001"], category: "subcontract", amount: 12000 },
    { project_id: prj["OB-2026-002"], category: "material", amount: 38000 },
    { project_id: prj["OB-2026-002"], category: "labor", amount: 32000 },
    { project_id: prj["OB-2026-003"], category: "material", amount: 6200 },
    { project_id: prj["OB-2026-003"], category: "labor", amount: 3900 },
    { project_id: prj["OB-2026-004"], category: "material", amount: 2300 },
    { project_id: prj["OB-2026-004"], category: "labor", amount: 2900 },
  ], { defaultToNull: false }),
  "costes previstos",
);
must(
  await A.from("project_assignments").insert([
    { project_id: prj["OB-2026-001"], employee_id: empByCode["T-001"], role_in_project: "Responsable de obra" },
    { project_id: prj["OB-2026-001"], employee_id: empByCode["T-004"], role_in_project: "Ayudante" },
    { project_id: prj["OB-2026-002"], employee_id: empByCode["T-002"], role_in_project: "Oficial" },
  ], { defaultToNull: false }),
  "asignaciones",
);
must(
  await A.from("project_expenses").insert([
    { project_id: prj["OB-2026-001"], category: "labor", description: "Mano de obra octubre (partes)", hours: 640, hourly_rate: 22.5, amount: 14400, employee_id: null },
    { project_id: prj["OB-2026-001"], category: "rental", description: "Alquiler plataforma elevadora", amount: 1150 },
    { project_id: prj["OB-2026-002"], category: "labor", description: "Mano de obra octubre (partes)", hours: 310, hourly_rate: 22.5, amount: 6975 },
    { project_id: prj["OB-2026-002"], category: "travel", description: "Desplazamientos y dietas", amount: 420 },
    { project_id: prj["OB-2026-004"], category: "labor", description: "Mano de obra total", hours: 120, hourly_rate: 21, amount: 2520 },
  ], { defaultToNull: false }),
  "gastos de obra",
);

// ---------------------------------------------------------------------------
console.log("· Catálogo de materiales");
const unitRows = must(await A.from("units").select("id,code"), "unidades");
const unit = Object.fromEntries(unitRows.map((u) => [u.code, u.id]));
const catRows = must(await A.from("material_categories").select("id,name"), "categorías");
const mcat = Object.fromEntries(catRows.map((c) => [c.name, c.id]));
const S0 = suppliers[0].id, S1 = suppliers[1].id, S2 = suppliers[2].id;
// [código, nombre, categoría, marca, ref, unidad, mín, ubicación, proveedor, coste, cantidad compra]
const catalog = [
  ["CAB-001", "Cable H07V-K 1,5 mm² azul", "Cableado", "Genérico", "H07VK1.5AZ", "m", 300, "A-01", S0, 0.21, 1200],
  ["CAB-002", "Cable H07V-K 2,5 mm² marrón", "Cableado", "Genérico", "H07VK2.5MR", "m", 300, "A-01", S0, 0.33, 1000],
  ["CAB-003", "Cable H07V-K 6 mm² negro", "Cableado", "Genérico", "H07VK6NG", "m", 100, "A-02", S0, 0.82, 400],
  ["CAB-004", "Cable RZ1-K 0,6/1 kV 3G2,5", "Cableado", "Genérico", "RZ13G2.5", "m", 100, "A-02", S0, 1.45, 300],
  ["CAB-005", "Cable UTP Cat 6 exterior", "Telecomunicaciones", "Genérico", "UTP6EXT", "bobina", 2, "A-03", S2, 98.0, 6],
  ["MEC-001", "Interruptor simple blanco", "Mecanismos", "Marca A", "INT-S-BL", "ud", 50, "B-01", S1, 2.9, 200],
  ["MEC-002", "Conmutador blanco", "Mecanismos", "Marca A", "CONM-BL", "ud", 40, "B-01", S1, 3.4, 150],
  ["MEC-003", "Base de enchufe Schuko blanca", "Mecanismos", "Marca A", "SCH-BL", "ud", 60, "B-01", S1, 3.1, 300],
  ["MEC-004", "Marco 1 elemento blanco", "Mecanismos", "Marca A", "MAR1-BL", "ud", 60, "B-02", S1, 0.95, 400],
  ["CUA-001", "Caja de distribución 24 módulos", "Cuadros eléctricos", "Marca B", "CD24", "ud", 5, "C-01", S0, 38.5, 20],
  ["CUA-002", "Caja ICP empotrar", "Cuadros eléctricos", "Marca B", "ICP-E", "ud", 5, "C-01", S0, 7.8, 30],
  ["PRO-001", "Magnetotérmico 1P+N 16 A", "Protecciones", "Marca C", "MT1PN16", "ud", 30, "C-02", S0, 6.9, 120],
  ["PRO-002", "Magnetotérmico 1P+N 10 A", "Protecciones", "Marca C", "MT1PN10", "ud", 30, "C-02", S0, 6.7, 90],
  ["PRO-003", "Diferencial 2P 40 A 30 mA", "Protecciones", "Marca C", "DIF2P40", "ud", 10, "C-02", S0, 32.0, 40],
  ["PRO-004", "Sobretensiones permanentes y transitorias", "Protecciones", "Marca C", "SOBRET", "ud", 4, "C-03", S0, 74.0, 8],
  ["ILU-001", "Downlight LED 18 W 4000 K", "Iluminación", "Marca D", "DL18-40", "ud", 20, "D-01", S1, 9.8, 80],
  ["ILU-002", "Pantalla estanca LED 36 W", "Iluminación", "Marca D", "PE36", "ud", 10, "D-02", S1, 21.5, 30],
  ["ILU-003", "Emergencia LED 300 lm", "Iluminación", "Marca D", "EM300", "ud", 10, "D-02", S1, 18.9, 25],
  ["CAN-001", "Bandeja perforada 60x100", "Canalizaciones", "Marca E", "BP60100", "m", 30, "E-01", S0, 7.2, 90],
  ["CAN-002", "Canaleta PVC 40x60", "Canalizaciones", "Marca E", "CN4060", "m", 30, "E-01", S0, 3.6, 60],
  ["TUB-001", "Tubo corrugado Ø20 mm", "Tubos y accesorios", "Genérico", "CORR20", "rollo", 6, "E-02", S0, 9.5, 25],
  ["TUB-002", "Tubo corrugado Ø25 mm", "Tubos y accesorios", "Genérico", "CORR25", "rollo", 6, "E-02", S0, 12.4, 20],
  ["TUB-003", "Caja de registro empotrar 100x100", "Tubos y accesorios", "Genérico", "CR100", "ud", 50, "E-03", S0, 0.85, 300],
  ["TEL-001", "Toma RJ45 Cat 6", "Telecomunicaciones", "Marca A", "RJ45C6", "ud", 20, "B-03", S2, 6.4, 60],
  ["CCTV-001", "Cámara IP domo 4 MP", "CCTV", "Marca F", "IPD4MP", "ud", 4, "F-01", S2, 69.0, 16],
  ["CCTV-002", "Grabador NVR 8 canales PoE", "CCTV", "Marca F", "NVR8POE", "ud", 1, "F-01", S2, 189.0, 3],
  ["CCTV-003", "Disco duro 2 TB videovigilancia", "CCTV", "Marca G", "HDD2TB", "ud", 2, "F-02", S2, 64.0, 5],
  ["ALA-001", "Central de alarma 8 zonas", "Alarmas", "Marca H", "CA8Z", "ud", 1, "F-03", S2, 112.0, 3],
  ["ALA-002", "Detector PIR interior", "Alarmas", "Marca H", "PIR-INT", "ud", 6, "F-03", S2, 14.5, 24],
  ["ALA-003", "Sirena exterior con flash", "Alarmas", "Marca H", "SIR-EXT", "ud", 2, "F-03", S2, 38.0, 6],
  ["HER-001", "Bridas negras 200 mm (100 ud)", "Herramientas fungibles", "Genérico", "BR200", "paq", 10, "G-01", S0, 2.4, 40],
  ["HER-002", "Cinta aislante negra", "Herramientas fungibles", "Genérico", "CINTA-NG", "ud", 20, "G-01", S0, 0.9, 60],
];
const mats = must(
  await A.from("materials")
    .insert(
      catalog.map(([code, name, c, brand, model_ref, u, min, location, sup]) => ({
        code, name, category_id: mcat[c], brand, model_ref, unit_id: unit[u], min_stock: min, location, default_supplier_id: sup,
      })),
    )
    .select("id,code"),
  "materiales",
);
const M = Object.fromEntries(mats.map((m) => [m.code, m.id]));

console.log("· Entradas por compra");
for (const [sup, ref] of [[S0, "ALB-S0-0001"], [S1, "ALB-S1-0001"], [S2, "ALB-S2-0001"]]) {
  const lines = catalog.filter((r) => r[8] === sup).map((r) => ({ material_id: M[r[0]], quantity: r[10], unit_cost: r[9] }));
  must(await A.rpc("inv_purchase", { p_supplier: sup, p_reference: ref, p_lines: lines, p_date: addDays(-100) }), "entrada");
}
// Segunda compra con otro precio (para comprobar el precio medio ponderado)
must(
  await A.rpc("inv_purchase", {
    p_supplier: S0, p_reference: "ALB-S0-0002", p_date: addDays(-20),
    p_lines: [{ material_id: M["CAB-002"], quantity: 500, unit_cost: 0.39 }, { material_id: M["PRO-001"], quantity: 40, unit_cost: 7.4 }],
  }),
  "entrada 2",
);

// ---------------------------------------------------------------------------
console.log("· Flujo de solicitudes, salidas y devoluciones");
must(await W1.rpc("worker_join_project", { p_project: prj["OB-2026-001"] }), "unirse a obra");
const req1 = must(
  await W1.rpc("request_create", {
    p_project: prj["OB-2026-001"], p_priority: "high", p_notes: "Para la planta 2",
    p_items: [{ material_id: M["CAB-002"], quantity: 400 }, { material_id: M["MEC-003"], quantity: 60 }, { material_id: M["PRO-001"], quantity: 24 }],
  }),
  "solicitud 1",
);
must(await A.rpc("request_set_status", { p_request: req1, p_status: "approved" }), "aprobar");
const doc1 = must(
  await A.rpc("inv_issue", {
    p_project: prj["OB-2026-001"], p_request: req1,
    p_lines: [{ material_id: M["CAB-002"], quantity: 400 }, { material_id: M["MEC-003"], quantity: 60 }, { material_id: M["PRO-001"], quantity: 24 }],
  }),
  "entrega solicitud",
);
must(await W1.rpc("inv_confirm_reception", { p_document: doc1 }), "confirmar recepción");

// Solicitud pendiente (para que administración la vea)
must(
  await W2.rpc("request_create", {
    p_project: prj["OB-2026-002"], p_priority: "normal",
    p_items: [{ material_id: M["CAN-001"], quantity: 40 }, { material_id: M["ILU-002"], quantity: 12 }, { free_text: "Prensaestopas M25 (no catalogado)", quantity: 20 }],
  }),
  "solicitud 2",
);
// Solicitud preparada pendiente de recoger
const req3 = must(
  await W1.rpc("request_create", {
    p_project: prj["OB-2026-001"], p_priority: "normal",
    p_items: [{ material_id: M["ILU-001"], quantity: 30 }, { material_id: M["MEC-004"], quantity: 80 }],
  }),
  "solicitud 3",
);
must(await A.rpc("request_set_status", { p_request: req3, p_status: "prepared" }), "preparar");

// Salida directa del trabajador y devolución
must(await W2.rpc("worker_join_project", { p_project: prj["OB-2026-002"] }), "unirse a obra 2");
must(
  await W2.rpc("inv_issue", {
    p_project: prj["OB-2026-002"],
    p_lines: [{ material_id: M["CAB-004"], quantity: 120 }, { material_id: M["CAN-002"], quantity: 25 }, { material_id: M["TUB-001"], quantity: 6 }],
  }),
  "salida directa",
);
must(
  await W2.rpc("inv_return", {
    p_project: prj["OB-2026-002"], p_notes: "Sobrante de la planta baja",
    p_lines: [{ material_id: M["CAB-004"], quantity: 20, condition: "ok" }, { material_id: M["TUB-001"], quantity: 1, condition: "damaged" }],
  }),
  "devolución",
);
// Material de obras pasadas (para coste de la obra finalizada)
must(
  await A.rpc("inv_issue", {
    p_project: prj["OB-2026-004"], p_employee: empByCode["T-001"],
    p_lines: [{ material_id: M["CAB-001"], quantity: 250 }, { material_id: M["CAB-002"], quantity: 300 }, { material_id: M["CUA-001"], quantity: 1 }, { material_id: M["PRO-003"], quantity: 2 }, { material_id: M["PRO-002"], quantity: 6 }],
  }),
  "salida obra 4",
);
must(await A.from("projects").update({ status: "finished", actual_end_date: addDays(-28) }).eq("id", prj["OB-2026-004"]), "finalizar obra 4");
// Hace bajar stock bajo mínimo (genera alerta)
must(
  await A.rpc("inv_issue", {
    p_project: prj["OB-2026-001"], p_employee: empByCode["T-004"],
    p_lines: [{ material_id: M["PRO-004"], quantity: 5 }, { material_id: M["CCTV-002"], quantity: 2 }],
  }),
  "salida stock bajo",
);
must(await A.rpc("inv_adjust", { p_material: M["MEC-001"], p_quantity: -3, p_reason: "breakage", p_justification: "Rotos al descargar el pedido" }), "ajuste");

// El trabajador NO puede ver tesorería ni costes (comprobación rápida)
const leak = await W1.from("bank_accounts").select("id");
const leak2 = await W1.from("stock_balances").select("avg_unit_cost");
if ((leak.data ?? []).length || (leak2.data ?? []).length) throw new Error("¡Fuga de datos a trabajador!");

// ---------------------------------------------------------------------------
console.log("· Vehículos y herramientas");
const vehicles = must(
  await A.from("vehicles")
    .insert([
      { plate: "0000-DEM", brand: "Furgoneta", model: "Modelo A", ownership: "renting", odometer_km: 84200, itv_due: addDays(18), insurance_company: "Aseguradora Demo", insurance_due: addDays(160), next_service_due: addDays(45) },
      { plate: "1111-DEM", brand: "Furgoneta", model: "Modelo B", ownership: "owned", odometer_km: 132500, itv_due: addDays(210), insurance_company: "Aseguradora Demo", insurance_due: addDays(25), next_service_due: addDays(12) },
      { plate: "2222-DEM", brand: "Turismo", model: "Modelo C", ownership: "leasing", odometer_km: 40100, itv_due: addDays(400), insurance_company: "Aseguradora Demo", insurance_due: addDays(300) },
    ], { defaultToNull: false })
    .select("id,plate"),
  "vehículos",
);
must(await A.from("vehicle_events").insert([
  { vehicle_id: vehicles[1].id, kind: "maintenance", event_date: addDays(-70), odometer_km: 128000, description: "Cambio de aceite y filtros", cost: 186.4 },
  { vehicle_id: vehicles[0].id, kind: "breakdown", event_date: addDays(-15), odometer_km: 83900, description: "Pinchazo rueda trasera", cost: 65 },
], { defaultToNull: false }), "eventos vehículo");
must(await W1.rpc("worker_set_vehicle", { p_vehicle: vehicles[0].id }), "vehículo W1");
must(await W2.rpc("worker_set_vehicle", { p_vehicle: vehicles[1].id }), "vehículo W2");
const tools = must(
  await A.from("tools")
    .insert([
      { code: "HT-001", name: "Taladro percutor", brand: "Marca X", model: "TP-18", serial_number: "SN-DEMO-001", purchased_on: addDays(-500) },
      { code: "HT-002", name: "Comprobador de instalaciones", brand: "Marca Y", model: "CI-100", serial_number: "SN-DEMO-002", purchased_on: addDays(-300) },
      { code: "HT-003", name: "Escalera de tijera 7 peldaños", brand: "Marca Z", serial_number: "SN-DEMO-003" },
      { code: "HT-004", name: "Rozadora", brand: "Marca X", model: "RZ-125", serial_number: "SN-DEMO-004" },
    ], { defaultToNull: false })
    .select("id,code"),
  "herramientas",
);
must(await A.rpc("tool_assign", { p_tool: tools[0].id, p_employee: empByCode["T-001"], p_project: prj["OB-2026-001"], p_condition: "Buen estado" }), "herramienta 1");
must(await A.rpc("tool_assign", { p_tool: tools[1].id, p_employee: empByCode["T-002"], p_condition: "Calibrado" }), "herramienta 2");

console.log("· Incidencias");
must(await W1.from("incidents").insert({ project_id: prj["OB-2026-001"], title: "Falta acometida provisional en planta 3", description: "No hay tensión en el cuadro de obra de la planta 3.", severity: "high" }), "incidencia 1");
must(await W3.from("incidents").insert({ vehicle_id: vehicles[0].id, title: "Testigo de presión de neumáticos encendido", severity: "low" }), "incidencia 2");

// ---------------------------------------------------------------------------
console.log("· Tesorería y facturas");
const banks = must(
  await A.from("bank_accounts")
    .insert([
      { name: "Cuenta principal", bank_name: "Banco Demo", iban: "ES0000000000000000000001", opening_balance: 62000, opening_date: addDays(-150) },
      { name: "Cuenta pagos", bank_name: "Caja Ficticia", iban: "ES0000000000000000000002", opening_balance: 14500, opening_date: addDays(-150) },
    ], { defaultToNull: false })
    .select("id"),
  "cuentas",
);
const inv = must(
  await A.from("invoices")
    .insert([
      { direction: "issued", number: "F2026-0101", issue_date: addDays(-75), due_date: addDays(-15), client_id: clients[0].id, project_id: prj["OB-2026-001"], concept: "Certificación nº 1", base_amount: 30000, vat_amount: 0, vat_regime: "reverse_charge", guarantee_amount: 1500, guarantee_release_date: addDays(60) },
      { direction: "issued", number: "F2026-0115", issue_date: addDays(-30), due_date: addDays(30), client_id: clients[0].id, project_id: prj["OB-2026-001"], concept: "Certificación nº 2", base_amount: 22000, vat_amount: 0, vat_regime: "reverse_charge", guarantee_amount: 1100, guarantee_release_date: addDays(240) },
      { direction: "issued", number: "F2026-0120", issue_date: addDays(-40), due_date: addDays(-10), client_id: clients[1].id, project_id: prj["OB-2026-002"], concept: "Anticipo 20 %", base_amount: 19700, vat_amount: 4137, vat_regime: "general" },
      { direction: "issued", number: "F2026-0122", issue_date: addDays(-25), due_date: addDays(5), client_id: clients[3].id, project_id: prj["OB-2026-004"], concept: "Reforma eléctrica", base_amount: 7800, vat_amount: 1638, vat_regime: "general" },
      { direction: "received", number: "PRV-88231", issue_date: addDays(-100), due_date: addDays(-40), supplier_id: S0, destination: "stock", concept: "Material eléctrico (ALB-S0-0001)", base_amount: 4260, vat_amount: 894.6 },
      { direction: "received", number: "PRV-90112", issue_date: addDays(-20), due_date: addDays(40), supplier_id: S0, destination: "stock", concept: "Material eléctrico (ALB-S0-0002)", base_amount: 491, vat_amount: 103.11 },
      { direction: "received", number: "SUB-2026-17", issue_date: addDays(-12), due_date: addDays(3), supplier_id: S2, project_id: prj["OB-2026-001"], destination: "project", concept: "Subcontrata telecomunicaciones", base_amount: 3800, vat_amount: 0, vat_regime: "reverse_charge" },
    ], { defaultToNull: false })
    .select("id,number"),
  "facturas",
);
const invByNum = Object.fromEntries(inv.map((i) => [i.number, i.id]));
must(await A.rpc("invoice_register_payment", { p_invoice: invByNum["F2026-0101"], p_account: banks[0].id, p_date: addDays(-14), p_amount: 18000, p_notes: "Cobro parcial certificación 1" }), "cobro parcial");
must(await A.rpc("invoice_register_payment", { p_invoice: invByNum["F2026-0122"], p_account: banks[0].id, p_date: addDays(-3), p_amount: 9438 }), "cobro total");
must(await A.rpc("invoice_register_payment", { p_invoice: invByNum["PRV-88231"], p_account: banks[1].id, p_date: addDays(-40), p_amount: 5154.6 }), "pago proveedor");
must(await A.from("financial_transactions").insert([
  { account_id: banks[0].id, tx_date: addDays(-58), amount: -11800, kind: "expense", category: "Nóminas", description: "Nóminas del mes (agregado)" },
  { account_id: banks[0].id, tx_date: addDays(-28), amount: -11800, kind: "expense", category: "Nóminas", description: "Nóminas del mes (agregado)" },
  { account_id: banks[0].id, tx_date: addDays(-55), amount: -3900, kind: "expense", category: "Seguros sociales", description: "Seguros sociales" },
  { account_id: banks[0].id, tx_date: addDays(-25), amount: -3900, kind: "expense", category: "Seguros sociales", description: "Seguros sociales" },
  { account_id: banks[1].id, tx_date: addDays(-10), amount: -24.5, kind: "fee", category: "Comisiones", description: "Comisión mantenimiento" },
], { defaultToNull: false }), "movimientos");
must(await A.rpc("bank_transfer", { p_from: banks[0].id, p_to: banks[1].id, p_date: addDays(-8), p_amount: 5000, p_description: "Provisión cuenta de pagos" }), "transferencia");
must(await A.from("loans").insert([
  { lender: "Banco Demo", kind: "loan", principal: 60000, outstanding: 41250, interest_rate: 4.25, start_date: addDays(-700), end_date: addDays(1100), installment_amount: 1180, payment_day: 5, account_id: banks[0].id },
  { lender: "Caja Ficticia", kind: "credit_line", principal: 30000, outstanding: 0, interest_rate: 5.1, start_date: addDays(-200), end_date: addDays(165) },
], { defaultToNull: false }), "préstamos");
must(await A.from("recurring_commitments").insert([
  { kind: "rent", name: "Alquiler de la nave", counterparty: "Arrendador demo", amount: 1450, day_of_month: 1 },
  { kind: "renting", name: "Renting furgoneta 0000-DEM", counterparty: "Renting Demo", amount: 489, day_of_month: 10, vehicle_id: vehicles[0].id },
  { kind: "payroll", name: "Nóminas (estimación agregada)", amount: 11800, day_of_month: 28, is_estimate: true },
  { kind: "social_security", name: "Seguros sociales (estimación)", amount: 3900, day_of_month: 30, is_estimate: true },
  { kind: "insurance", name: "Seguro de responsabilidad civil", counterparty: "Aseguradora Demo", amount: 1320, frequency: "yearly", day_of_month: 15, start_date: addDays(40) },
  { kind: "software", name: "Software de facturación", counterparty: "Proveedor software", amount: 29, day_of_month: 3 },
], { defaultToNull: false }), "compromisos");

console.log("· Personal: ausencias, formación y EPIs");
must(await A.from("absences").insert([
  { employee_id: empByCode["T-003"], kind: "vacation", start_date: addDays(20), end_date: addDays(26), days: 5 },
  { employee_id: empByCode["T-001"], kind: "vacation", start_date: addDays(-200), end_date: addDays(-190), days: 9 },
], { defaultToNull: false }), "ausencias");
must(await A.from("trainings").insert([
  { employee_id: empByCode["T-001"], name: "PRL 20 h Electricidad", provider: "Entidad formativa demo", hours: 20, completed_on: addDays(-1500), expires_on: addDays(20) },
  { employee_id: empByCode["T-002"], name: "Trabajos en altura", provider: "Entidad formativa demo", hours: 8, completed_on: addDays(-300), expires_on: addDays(400) },
], { defaultToNull: false }), "formación");
must(await A.from("ppe_deliveries").insert([
  { employee_id: empByCode["T-001"], item: "Guantes dieléctricos clase 0", delivered_on: addDays(-170), next_renewal_on: addDays(10), acknowledged: true },
  { employee_id: empByCode["T-004"], item: "Botas de seguridad S3", delivered_on: addDays(-60), next_renewal_on: addDays(300), acknowledged: true },
], { defaultToNull: false }), "EPIs");

console.log("· Partes de trabajo");
must(await A.from("companies").update({ trade_name: "RS Instalaciones (demo)", tagline: "Instalaciones eléctricas, CCTV y alarmas", phone: "600000099", email: "info@empresa.example" }).eq("id", COMPANY), "empresa");
const pf = must(await W1.rpc("work_report_prefill", { p_project: prj["OB-2026-001"] }), "datos del parte");
const pfFields = { ...pf };
delete pfFields.team;
const pt1 = must(await W1.rpc("work_report_save", {
  p_report: { ...pfFields, project_id: prj["OB-2026-001"], report_date: addDays(-2), work_types: ["installation"], work_done: "Tendido de líneas en planta 2 y conexionado del cuadro de vivienda 2B.", maintenance_type: "none", client_signer_name: "Encargado Demo" },
  p_lines: [
    { description: "Tendido de líneas planta 2", technician_name: "Luis Ejemplo Uno", start_time: "08:00", end_time: "12:00" },
    { description: "Conexionado cuadro vivienda 2B", technician_name: "Luis Ejemplo Uno", start_time: "12:30", end_time: "15:00" },
  ],
  p_status: "submitted",
}), "parte 1");
must(await A.from("work_report_billing").insert({ report_id: pt1, amount: 320 }), "importe parte 1");
must(await A.from("work_reports").update({ status: "validated" }).eq("id", pt1), "validar parte 1");
must(await W1.rpc("work_report_save", {
  p_report: { ...pfFields, project_id: prj["OB-2026-001"], report_date: addDays(0), work_types: ["breakdown"], work_done: "Revisión de diferencial que salta en zona común.", observations: "Pendiente de sustituir el diferencial de 40 A." },
  p_lines: [{ description: "Localizar avería zona común", technician_name: "Luis Ejemplo Uno", start_time: "08:00", end_time: "09:30" }],
  p_status: "submitted",
}), "parte 2");

const bad = must(await A.rpc("inv_verify_balances"), "verificación");
if (bad.length) throw new Error("Saldos de stock descuadrados: " + JSON.stringify(bad));

console.log("\n✔ Datos de demostración creados. Usuarios (contraseña de demo: " + PASSWORD + "):");
for (const a of accounts) console.log(`   ${a.role === "admin" ? "Administrador" : "Trabajador  "}  ${a.username}`);
