import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { bankingConfigured } from "@/lib/banking/enablebanking";
import { syncAll } from "@/features/banking/sync";

/**
 * Actualización automática diaria (tarea programada de Vercel).
 * Solo se ejecuta si la petición trae el secreto CRON_SECRET que Vercel añade.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok = !!secret && auth.length === expected.length && timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
  if (!ok) return new NextResponse("No autorizado", { status: 401 });
  if (!bankingConfigured()) return NextResponse.json({ skipped: "Conexión bancaria no configurada" });
  const results = await syncAll();
  return NextResponse.json({ connections: results.length, imported: results.reduce((s, r) => s + r.imported, 0), errors: results.filter((r) => r.error).length });
}
