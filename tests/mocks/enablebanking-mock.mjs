/**
 * Simulador de la API de Enable Banking para pruebas (NO se usa en producción).
 * Implementa el flujo real: /aspsps, /auth → página del "banco" → retorno con
 * code/state, /sessions, saldos y movimientos, y verifica la firma JWT RS256.
 *
 * Uso: node tests/mocks/enablebanking-mock.mjs <puerto> <clave-publica.pem>
 */
import http from "node:http";
import { createVerify, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const PORT = Number(process.argv[2] ?? 4010);
const PUBLIC_KEY = readFileSync(process.argv[3], "utf8");
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const auths = new Map(); // code -> datos de la autorización
const sessions = new Map(); // session_id -> { accounts }
let calls = 0;

const ACCOUNTS = [
  { uid: "acc-principal", account_id: { iban: "ES00 0000 0000 0000 0000 0001" }, details: "Cuenta corriente empresas", currency: "EUR", cash_account_type: "CACC" },
  { uid: "acc-nueva", account_id: { iban: "ES9900000000000000009999" }, details: "Cuenta de ahorro", currency: "EUR", cash_account_type: "SVGS" },
];
const TX = {
  "acc-principal": [
    { entry_reference: "E-1", transaction_amount: { amount: "20900.00", currency: "EUR" }, credit_debit_indicator: "CRDT", status: "BOOK", booking_date: day(-1), debtor: { name: "CONSTRUCTORA EJEMPLO SL" }, remittance_information: ["TRANSF PAGO F2026-0115"] },
    { entry_reference: "E-2", transaction_amount: { amount: "1450.00", currency: "EUR" }, credit_debit_indicator: "DBIT", status: "BOOK", booking_date: day(-2), creditor: { name: "ARRENDADOR DEMO" }, remittance_information: ["ALQUILER NAVE"] },
    { entry_reference: "E-3", transaction_amount: { amount: "50.00", currency: "EUR" }, credit_debit_indicator: "DBIT", status: "PDNG", booking_date: null, value_date: day(0), remittance_information: ["PENDIENTE"] },
  ],
  "acc-nueva": [{ transaction_amount: { amount: "120.00", currency: "EUR" }, credit_debit_indicator: "CRDT", status: "BOOK", booking_date: day(-3), remittance_information: ["INTERESES"] }],
};
const BAL = { "acc-principal": "70000.00", "acc-nueva": "3000.00" };

function verifyJwt(auth) {
  const tok = (auth ?? "").replace(/^Bearer /, "");
  const [h, b, s] = tok.split(".");
  if (!h || !b || !s) return false;
  const header = JSON.parse(Buffer.from(h, "base64url"));
  const body = JSON.parse(Buffer.from(b, "base64url"));
  const v = createVerify("RSA-SHA256");
  v.update(`${h}.${b}`);
  const now = Math.floor(Date.now() / 1000);
  return header.alg === "RS256" && header.kid === "test-app" && body.iss === "enablebanking.com" && body.aud === "api.enablebanking.com" &&
    body.exp > now && body.exp - body.iat <= 86400 && v.verify(PUBLIC_KEY, Buffer.from(s, "base64url"));
}

const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  let body = "";
  for await (const c of req) body += c;
  const data = body ? JSON.parse(body) : null;

  // Página del "banco" (el usuario autoriza y vuelve a la app)
  if (url.pathname === "/bank-login") {
    const code = randomUUID();
    auths.set(code, auths.get(url.searchParams.get("auth")));
    const a = auths.get(code);
    res.writeHead(302, { Location: `${a.redirect_url}?code=${code}&state=${a.state}` });
    return res.end();
  }
  if (url.pathname === "/__stats") return json(res, 200, { calls });
  if (!verifyJwt(req.headers.authorization)) return json(res, 401, { message: "Invalid JWT", error: "UNAUTHORIZED", code: 401 });
  calls++;

  if (req.method === "GET" && url.pathname === "/aspsps")
    return json(res, 200, { aspsps: [{ name: "Banco Santander", country: "ES", maximum_consent_validity: 15552000 }, { name: "Cajamar Caja Rural", country: "ES", maximum_consent_validity: 15552000 }, { name: "Banco Sabadell", country: "ES" }, { name: "Caja Rural de Utrera", country: "ES" }] });
  if (req.method === "POST" && url.pathname === "/auth") {
    if (!data?.access?.valid_until || !data?.aspsp?.name || !data?.state || !data?.redirect_url) return json(res, 422, { message: "Missing fields", error: "WRONG_REQUEST_PARAMETERS" });
    const id = randomUUID();
    auths.set(id, { ...data });
    return json(res, 200, { url: `http://127.0.0.1:${PORT}/bank-login?auth=${id}`, authorization_id: id, psu_id_hash: "x" });
  }
  if (req.method === "POST" && url.pathname === "/sessions") {
    const a = auths.get(data?.code);
    if (!a) return json(res, 400, { message: "Invalid code", error: "WRONG_AUTHORIZATION_CODE" });
    const session_id = randomUUID();
    sessions.set(session_id, { accounts: ACCOUNTS });
    return json(res, 200, { session_id, accounts: ACCOUNTS, aspsp: a.aspsp, psu_type: a.psu_type, access: { valid_until: a.access.valid_until } });
  }
  if (req.method === "DELETE" && url.pathname.startsWith("/sessions/")) { sessions.delete(url.pathname.split("/")[2]); return json(res, 200, { message: "OK" }); }
  const m = url.pathname.match(/^\/accounts\/([^/]+)\/(balances|transactions)$/);
  if (m && req.method === "GET") {
    if (m[2] === "balances") return json(res, 200, { balances: [{ name: "Disponible", balance_amount: { amount: String(Number(BAL[m[1]]) - 10), currency: "EUR" }, balance_type: "CLAV" }, { name: "Contable", balance_amount: { amount: BAL[m[1]], currency: "EUR" }, balance_type: "CLBD" }] });
    // Paginación: primera página con continuation_key, segunda con el resto
    const list = (TX[m[1]] ?? []).filter((t) => !t.booking_date || t.booking_date >= url.searchParams.get("date_from"));
    if (!url.searchParams.get("continuation_key") && list.length > 1) return json(res, 200, { transactions: list.slice(0, 1), continuation_key: "page2" });
    return json(res, 200, { transactions: url.searchParams.get("continuation_key") ? list.slice(1) : list, continuation_key: null });
  }
  return json(res, 404, { message: "Not found" });
}).listen(PORT, "127.0.0.1", () => console.log(`Banco simulado en :${PORT}`));
