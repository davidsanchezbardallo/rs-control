import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Pestañas por enlace (cada una es una URL; funcionan con "atrás" del navegador). */
export function Tabs({ items, active }: { items: { href: string; label: string; count?: number }[]; active: string }) {
  return (
    <nav aria-label="Secciones" className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max gap-1 border-b border-line px-1">
        {items.map((t) => {
          const on = t.href === active;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-10 items-center gap-1.5 px-3 text-[14px] transition-colors",
                  on ? "font-medium text-ink" : "text-muted hover:text-ink",
                )}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={cn("rounded-full px-1.5 text-[11px] leading-[18px]", on ? "bg-brand-600 text-white" : "bg-surface-2 text-ink-2")}>{t.count}</span>
                )}
                {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" aria-hidden="true" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
