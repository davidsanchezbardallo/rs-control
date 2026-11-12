"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { NotificationsMenu } from "./NotificationsMenu";
import { WORKER_NAV, isActive } from "@/lib/navigation/nav";
import { cn } from "@/lib/utils/cn";
import type { NotificationItem } from "@/features/system/notifications";

/**
 * Marco de la app del trabajador, pensada para el móvil:
 * cabecera mínima + barra inferior con 5 accesos grandes.
 */
export function WorkerShell({ notifications, children }: { notifications: NotificationItem[]; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/mi" aria-label="Inicio">
            <Logo />
          </Link>
          <NotificationsMenu items={notifications} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">{children}</main>

      <nav
        aria-label="Navegación"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-canvas/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150"
      >
        <ul className="mx-auto grid h-16 max-w-2xl grid-cols-5">
          {WORKER_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                    active ? "text-brand-600" : "text-muted",
                  )}
                >
                  <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
