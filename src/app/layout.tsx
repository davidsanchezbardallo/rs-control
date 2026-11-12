import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// next/font descarga la fuente al compilar y la sirve desde nuestro dominio:
// el navegador del usuario no contacta con Google (mejor para el RGPD).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "RS Control", template: "%s · RS Control" },
  description: "Gestión empresarial de RS Instalaciones XXI SL",
  applicationName: "RS Control",
  appleWebApp: { capable: true, title: "RS Control", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false }, // aplicación privada: no indexar
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
