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
  // Cache Components desactivado a propósito: todos los datos son privados y
  // por usuario; renderizar siempre en servidor evita servir datos cacheados
  // de un usuario a otro (ver docs/02-arquitectura.md).
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
    return [
      { source: "/:path*", headers: securityHeaders },
      // El service worker nunca se cachea, para que las actualizaciones lleguen al momento
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
    ];
  },
};

export default nextConfig;
