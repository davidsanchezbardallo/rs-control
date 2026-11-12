import { describe, expect, it } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { mapTransaction, pickBalance, normalizeIban } from "./mapping";
import { scoreCandidate, suggest, type Candidate } from "./reconcile";
import { signJwt } from "@/lib/banking/enablebanking";

describe("firma JWT para Enable Banking", () => {
  it("cabecera, claims y firma RS256 válidos", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const jwt = signJwt("app-123", pem, 1_700_000_000);
    const [h, b, s] = jwt.split(".");
    const dec = (x: string) => JSON.parse(Buffer.from(x, "base64url").toString());
    expect(dec(h!)).toEqual({ typ: "JWT", alg: "RS256", kid: "app-123" });
    expect(dec(b!)).toEqual({ iss: "enablebanking.com", aud: "api.enablebanking.com", iat: 1_700_000_000, exp: 1_700_003_600 });
    const v = createVerify("RSA-SHA256");
    v.update(`${h}.${b}`);
    expect(v.verify(publicKey, Buffer.from(s!, "base64url"))).toBe(true);
  });
});

describe("importación de movimientos", () => {
  const base = { transaction_amount: { amount: "1234.50", currency: "EUR" }, status: "BOOK", booking_date: "2026-11-10" };
  it("signo según cargo/abono y concepto legible", () => {
    const inc = mapTransaction({ ...base, credit_debit_indicator: "CRDT", entry_reference: "A1", debtor: { name: "CONSTRUCTORA EJEMPLO SL" }, remittance_information: ["PAGO F2026-0115"] })!;
    expect(inc).toMatchObject({ amount: 1234.5, kind: "income", external_id: "ref:A1", description: "PAGO F2026-0115", counterparty_name: "CONSTRUCTORA EJEMPLO SL" });
    const exp = mapTransaction({ ...base, credit_debit_indicator: "DBIT", entry_reference: "A2", creditor: { name: "ENDESA" } })!;
    expect(exp).toMatchObject({ amount: -1234.5, kind: "expense", description: "ENDESA" });
  });
  it("ignora pendientes y genera identificador estable sin referencia", () => {
    expect(mapTransaction({ ...base, credit_debit_indicator: "CRDT", status: "PDNG" })).toBeNull();
    const a = mapTransaction({ ...base, credit_debit_indicator: "DBIT", remittance_information: ["RECIBO"] })!;
    const b = mapTransaction({ ...base, credit_debit_indicator: "DBIT", remittance_information: ["RECIBO"] })!;
    expect(a.external_id).toBe(b.external_id);
    expect(a.external_id.startsWith("h:")).toBe(true);
  });
  it("elige el saldo contable", () => {
    expect(pickBalance([
      { balance_amount: { amount: "10", currency: "EUR" }, balance_type: "CLAV" },
      { balance_amount: { amount: "12.345", currency: "EUR" }, balance_type: "CLBD" },
    ])).toEqual({ amount: 12.35, type: "CLBD" });
    expect(pickBalance([])).toBeNull();
    expect(normalizeIban("es91 2100 0418")).toBe("ES9121000418");
  });
});

describe("propuestas de conciliación", () => {
  const inv: Candidate = { id: "1", number: "F2026-0115", direction: "issued", party_name: "Constructora Ejemplo SL", outstanding: 9900, guarantee: 0, issue_date: "2026-10-01", due_date: "2026-11-01" };
  it("número, importe y cliente dan máxima confianza", () => {
    expect(scoreCandidate({ amount: 9900, tx_date: "2026-11-02", description: "TRANSF F2026-0115", counterparty_name: "CONSTRUCTORA EJEMPLO" }, inv)).toBe(100);
  });
  it("no propone un pago para una factura emitida", () => {
    expect(scoreCandidate({ amount: -9900, tx_date: "2026-11-02", description: "F2026-0115", counterparty_name: null }, inv)).toBe(0);
  });
  it("tiene en cuenta la retención de garantía", () => {
    const g = { ...inv, guarantee: 495 };
    expect(scoreCandidate({ amount: 9405, tx_date: "2026-11-02", description: "TRANSFERENCIA", counterparty_name: null }, g)).toBeGreaterThanOrEqual(40);
  });
  it("ordena y filtra las propuestas", () => {
    const other: Candidate = { ...inv, id: "2", number: "F2026-0200", party_name: "Otro Cliente", outstanding: 500 };
    const r = suggest({ amount: 9900, tx_date: "2026-11-02", description: "CONSTRUCTORA EJEMPLO", counterparty_name: null }, [other, inv]);
    expect(r.map((x) => x.c.id)).toEqual(["1"]);
  });
});
