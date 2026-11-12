import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/auth/session";

/** Descarga segura: comprueba que es admin y redirige a una URL firmada válida 60 segundos. */
export async function GET(_: Request, ctx: RouteContext<"/api/documentos/[id]">) {
  const { id } = await ctx.params;
  const s = await getAdminOrNull();
  if (!s) return new NextResponse("No autorizado", { status: 403 });
  const { data: doc } = await s.supabase.from("documents").select("storage_path, title").eq("id", id).maybeSingle();
  if (!doc) return new NextResponse("No encontrado", { status: 404 });
  const { data } = await s.supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
  if (!data) return new NextResponse("No disponible", { status: 404 });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
