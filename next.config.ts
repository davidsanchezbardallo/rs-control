import type { NextConfig } from "next";

// Cabeceras de seguridad aplicadas a todas las respuestas.
// La Content-Security-Policy completa se añade en la Fase 3 (cuando se conozcan
// los dominios de Supabase que la app necesita contactar).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" }, // impide incrustar la app en otras webs
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
