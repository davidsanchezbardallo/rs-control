"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Menú desplegable ligero: se cierra al pulsar fuera o con Escape. */
export function Popover({
  trigger,
  children,
  align = "right",
  label,
  panelClassName,
}: {
  trigger: (open: boolean) => ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  label: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="rounded-[var(--radius-md)]"
      >
        {trigger(open)}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={cn(
            "absolute top-full z-50 mt-2 animate-fade-in rounded-[var(--radius-lg)] bg-canvas shadow-overlay ring-1 ring-line",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
