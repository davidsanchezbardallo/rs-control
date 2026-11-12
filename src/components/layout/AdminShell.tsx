"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { Sidebar, SidebarNav } from "./Sidebar";
import { NotificationsMenu } from "./NotificationsMenu";
import { ProfileMenu, type ShellUser } from "./ProfileMenu";
import { Logo } from "@/components/brand/Logo";
import type { NotificationItem } from "@/features/system/notifications";

/**
 * Marco de la zona de administración: barra lateral, cabecera con buscador,
 * notificaciones y perfil. En móvil/tablet la barra lateral pasa a un cajón.
 */
export function AdminShell({
  user,
  notifications,
  children,
}: {
  user: ShellUser;
  notifications: NotificationItem[];
  children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  // Atajo de teclado "/" para ir al buscador
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-canvas">
      <Sidebar />

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 animate-fade-in bg-ink/25" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-slide-in flex-col bg-surface shadow-overlay">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Cerrar menú"
                className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] text-ink-2 hover:bg-surface-2"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/85 backdrop-blur-xl backdrop-saturate-150">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Abrir menú"
              className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] text-ink-2 hover:bg-surface lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="lg:hidden">
              <Logo compact />
            </div>

            <form role="search" action="/buscar" method="get" className="hidden flex-1 md:block">
              <label className="relative block max-w-md">
                <span className="sr-only">Buscar en RS Control</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
                <input
                  type="search"
                  name="q"
                  id="global-search"
                  placeholder="Buscar obras, materiales, trabajadores…"
                  className="h-10 w-full rounded-[var(--radius-md)] bg-surface pr-14 pl-9 text-[14px] text-ink placeholder:text-subtle focus:bg-canvas focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-line bg-canvas px-1.5 text-[11px] text-muted">
                  /
                </kbd>
              </label>
            </form>

            <div className="ml-auto flex items-center gap-1">
              <Link
                href="/buscar"
                aria-label="Buscar"
                className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] text-ink-2 hover:bg-surface md:hidden"
              >
                <Search className="h-[19px] w-[19px]" aria-hidden="true" />
              </Link>
              <NotificationsMenu items={notifications} />
              <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
              <ProfileMenu user={user} profileHref="/configuracion/perfil" />
            </div>
          </div>
        </header>

        <main id="contenido" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
