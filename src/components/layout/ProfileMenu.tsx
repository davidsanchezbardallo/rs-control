"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { Popover } from "./Popover";
import { logout } from "@/app/login/actions";

export type ShellUser = { name: string; roleLabel: string; initials: string };

export function Avatar({ initials, size = "md" }: { initials: string; size?: "md" | "lg" }) {
  return (
    <span
      className={
        size === "lg"
          ? "grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-[16px] font-semibold text-brand-700"
          : "grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700"
      }
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function ProfileMenu({ user, profileHref }: { user: ShellUser; profileHref: string }) {
  return (
    <Popover
      label="Menú de perfil"
      panelClassName="w-60 p-1.5"
      trigger={() => (
        <span className="flex h-10 items-center gap-2.5 rounded-[var(--radius-md)] pr-2 pl-1 transition-colors hover:bg-surface">
          <Avatar initials={user.initials} />
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-[13px] font-medium text-ink">{user.name}</span>
            <span className="block text-[11px] text-muted">{user.roleLabel}</span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-subtle md:block" aria-hidden="true" />
        </span>
      )}
    >
      <div className="px-2.5 pt-2 pb-2.5">
        <p className="text-[13px] font-medium text-ink">{user.name}</p>
        <p className="text-[12px] text-muted">{user.roleLabel}</p>
      </div>
      <div className="my-1 h-px bg-line" />
      <MenuLink href={profileHref} icon={<UserRound className="h-4 w-4" />}>Mi perfil</MenuLink>
      <MenuLink href="/configuracion" icon={<Settings className="h-4 w-4" />}>Configuración</MenuLink>
      <div className="my-1 h-px bg-line" />
      <form action={logout}>
        <button type="submit" className="flex h-9 w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-[13px] text-ink-2 hover:bg-surface hover:text-ink">
          <span className="text-muted"><LogOut className="h-4 w-4" /></span>
          Cerrar sesión
        </button>
      </form>
    </Popover>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex h-9 items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-[13px] text-ink-2 hover:bg-surface hover:text-ink"
    >
      <span className="text-muted">{icon}</span>
      {children}
    </Link>
  );
}
