import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (antes "middleware"): se ejecuta antes de cada página.
 *  1. Renueva la sesión de Supabase (cookies) cuando caduca.
 *  2. Si no hay sesión, redirige a /login.
 * La comprobación de ROL se hace en el servidor (layouts) y en la base de datos (RLS).
 */
// /api/banca/sync: tarea programada; se protege con su propio secreto (CRON_SECRET)
const PUBLIC_PATHS = ["/login", "/manifest.webmanifest", "/offline", "/api/banca/sync", "/privacidad", "/condiciones"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Excluye archivos estáticos, iconos y el service worker
  matcher: ["/((?!_next/static|_next/image|icons/|logo/|sw.js|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico)$).*)"],
};
