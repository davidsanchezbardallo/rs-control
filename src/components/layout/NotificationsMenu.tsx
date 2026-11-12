"use client";

import { Bell } from "lucide-react";
import { Popover } from "./Popover";
import { cn } from "@/lib/utils/cn";
import type { DemoNotification } from "@/lib/demo/data";

export function NotificationsMenu({ items }: { items: DemoNotification[] }) {
  const unread = items.filter((n) => n.unread).length;
  return (
    <Popover
      label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
      panelClassName="w-[min(22rem,calc(100vw-2rem))]"
      trigger={(open) => (
        <span
          className={cn(
            "relative grid h-10 w-10 place-items-center rounded-[var(--radius-md)] text-ink-2 transition-colors hover:bg-surface",
            open && "bg-surface",
          )}
        >
          <Bell className="h-[19px] w-[19px]" strokeWidth={1.9} aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent-500 ring-2 ring-canvas" aria-hidden="true" />
          )}
        </span>
      )}
    >
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <p className="text-[14px] font-semibold text-ink">Notificaciones</p>
        <span className="text-[12px] text-muted">{unread} sin leer</span>
      </div>
      <ul className="max-h-80 overflow-y-auto pb-2">
        {items.map((n) => (
          <li key={n.id} className="mx-2 flex gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 hover:bg-surface">
            <span
              className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.unread ? "bg-brand-500" : "bg-transparent")}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">{n.title}</p>
              <p className="truncate text-[12px] text-muted">{n.body}</p>
              <p className="mt-0.5 text-[11px] text-muted">{n.when}</p>
            </div>
          </li>
        ))}
      </ul>
    </Popover>
  );
}
