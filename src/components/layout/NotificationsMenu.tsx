"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Popover } from "./Popover";
import { cn } from "@/lib/utils/cn";
import { markAllNotificationsRead, markNotificationRead, type NotificationItem } from "@/features/system/notifications";
import { formatDateTime } from "@/lib/utils/format";

export function NotificationsMenu({ items }: { items: NotificationItem[] }) {
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <Popover
      label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
      panelClassName="w-[min(24rem,calc(100vw-2rem))]"
      trigger={(open) => (
        <span className={cn("relative grid h-10 w-10 place-items-center rounded-[var(--radius-md)] text-ink-2 transition-colors hover:bg-surface", open && "bg-surface")}>
          <Bell className="h-[19px] w-[19px]" strokeWidth={1.9} aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-white ring-2 ring-canvas">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
      )}
    >
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <p className="text-[14px] font-semibold text-ink">Notificaciones</p>
        {unread > 0 && (
          <button type="button" onClick={() => markAllNotificationsRead()} className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700">
            <CheckCheck className="h-3.5 w-3.5" /> Marcar todo como leído
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-4 pt-2 pb-6 text-[13px] text-muted">No tienes notificaciones.</p>
      ) : (
        <ul className="max-h-96 overflow-y-auto pb-2">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={n.link ?? "#"}
                onClick={() => !n.read_at && markNotificationRead(n.id)}
                className="mx-2 flex gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 hover:bg-surface"
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-brand-500")} aria-hidden="true" />
                <span className="min-w-0">
                  <span className={cn("block text-[13px] text-ink", !n.read_at && "font-medium")}>{n.title}</span>
                  {n.body && <span className="block truncate text-[12px] text-muted">{n.body}</span>}
                  <span className="mt-0.5 block text-[11px] text-muted">{formatDateTime(n.created_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}
