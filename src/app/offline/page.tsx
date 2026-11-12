import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Sin conexión" };

/** Página que muestra la app instalada cuando no hay cobertura. No contiene datos. */
export default function Offline() {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-6 text-center">
      <div className="max-w-sm">
        <LogoMark className="mx-auto h-12 w-12" />
        <span className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-[var(--radius-lg)] bg-canvas text-muted shadow-card"><WifiOff className="h-6 w-6" /></span>
        <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-ink">Sin conexión</h1>
        <p className="mt-2 text-[15px] text-muted">RS Control necesita conexión para mostrar y guardar datos. Comprueba la cobertura y vuelve a intentarlo.</p>
        {/* Enlace normal (no <Link>) a propósito: fuerza una recarga completa al recuperar la conexión */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="mt-6 inline-flex h-12 items-center rounded-[var(--radius-md)] bg-brand-600 px-6 text-[15px] font-medium text-white">Reintentar</a>
      </div>
    </main>
  );
}
