import type { MetadataRoute } from "next";

/** Manifiesto PWA: permite "instalar" RS Control desde el navegador. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RS Control",
    short_name: "RS Control",
    description: "Gestión empresarial de RS Instalaciones XXI SL",
    lang: "es-ES",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
