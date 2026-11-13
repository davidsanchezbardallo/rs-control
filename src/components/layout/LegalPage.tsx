import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

/** Plantilla de páginas legales públicas (privacidad y condiciones). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-[var(--radius-xl)] bg-canvas p-6 shadow-card ring-1 ring-line/70 sm:p-10">
        <Link href="/login" aria-label="RS Control"><Logo /></Link>
        <h1 className="mt-8 text-[28px] font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-[13px] text-muted">Última actualización: {updated}</p>
        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-ink-2 [&_h2]:mt-8 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">{children}</div>
      </article>
    </div>
  );
}
