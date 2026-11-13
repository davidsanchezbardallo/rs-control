import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";

/** Imagen de una firma: el almacenamiento decide si el usuario puede verla (suya o administración). */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return new NextResponse("No autorizado", { status: 403 });
  const path = req.nextUrl.searchParams.get("p") ?? "";
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/.test(path)) return new NextResponse("Ruta no válida", { status: 400 });
  const { data } = await s.supabase.storage.from("signatures").createSignedUrl(path, 60);
  if (!data) return new NextResponse("No disponible", { status: 404 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
