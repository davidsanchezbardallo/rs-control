/**
 * Propuestas de conciliación: para un movimiento del banco, qué facturas
 * pendientes encajan mejor. Puntuación transparente (0-100):
 *  - número de factura en el concepto del banco: +50
 *  - importe exacto de lo pendiente (o pendiente menos retención de garantía): +40
 *  - nombre del cliente/proveedor en el concepto o el ordenante: +25
 *  - fechas: movimiento posterior a la emisión: +5; cerca del vencimiento: +5
 */
export type Candidate = {
  id: string;
  number: string;
  direction: "issued" | "received";
  party_name: string | null;
  outstanding: number;
  guarantee: number;
  issue_date: string;
  due_date: string | null;
};
export type BankMovement = { amount: number; tx_date: string; description: string; counterparty_name: string | null };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const STOP = new Set(["sl", "sa", "slu", "sociedad", "limitada", "anonima", "s.l.", "s.a.", "de", "del", "la", "el", "y", "c.", "p.", "cp"]);
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));

export function scoreCandidate(m: BankMovement, c: Candidate): number {
  if ((m.amount > 0) !== (c.direction === "issued")) return 0;
  if (c.outstanding <= 0.005) return 0;
  const text = norm(`${m.description} ${m.counterparty_name ?? ""}`);
  const amount = Math.abs(m.amount);
  let score = 0;
  if (c.number && text.includes(norm(c.number))) score += 50;
  if (Math.abs(amount - c.outstanding) < 0.01 || (c.guarantee > 0 && Math.abs(amount - (c.outstanding - c.guarantee)) < 0.01)) score += 40;
  else if (amount < c.outstanding) score += 5; // posible cobro parcial
  const partyWords = words(c.party_name ?? "");
  if (partyWords.length && partyWords.some((w) => text.includes(w))) score += 25;
  if (m.tx_date >= c.issue_date) score += 5;
  if (c.due_date) {
    const days = Math.abs((new Date(m.tx_date).getTime() - new Date(c.due_date).getTime()) / 86_400_000);
    if (days <= 15) score += 5;
  }
  return Math.min(100, score);
}

export function suggest(m: BankMovement, candidates: Candidate[], max = 3) {
  return candidates
    .map((c) => ({ c, score: scoreCandidate(m, c) }))
    .filter((x) => x.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}
