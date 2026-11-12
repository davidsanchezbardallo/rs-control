"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV, isActive } from "@/lib/navigation/nav";
import { can, type Role } from "@/lib/permissions/roles";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/brand/Logo";

/** Navegación lateral. Se reutiliza en escritorio (fija) y móvil (cajón). */
export function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegación principal" className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
      {ADMIN_NAV.map((group) => {
        const items = group.items.filter((i) => !i.permission || can(role, i.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">{group.label}</p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-9 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-[14px] transition-colors duration-150",
                        active
                          ? "bg-canvas font-medium text-ink shadow-card ring-1 ring-line/70"
                          : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {active && (
                        <span aria-hidden="true" className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-accent-500" />
                      )}
                      <item.icon
                        className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-600" : "text-muted group-hover:text-ink-2")}
                        strokeWidth={1.9}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-16 items-center px-6">
        <Link href="/panel" aria-label="RS Control, ir al panel">
          <Logo />
        </Link>
      </div>
      <SidebarNav role={role} />
      <div className="border-t border-line px-6 py-4 text-[11px] text-muted">
        RS Control · v0.1 · Fase 1
      </div>
    </aside>
  );
}
