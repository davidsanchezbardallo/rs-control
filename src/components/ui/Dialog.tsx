"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

/**
 * Ventana modal accesible (elemento <dialog> nativo).
 * `trigger` es el botón que la abre; el contenido recibe `close`.
 */
export function Dialog({
  trigger,
  title,
  description,
  children,
  triggerVariant = "secondary",
  triggerSize = "md",
  triggerIcon,
  wide = false,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  children: (close: () => void) => ReactNode;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger";
  triggerSize?: "sm" | "md" | "lg";
  triggerIcon?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const close = () => setOpen(false);
  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} icon={triggerIcon} onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <dialog
        ref={ref}
        onClose={close}
        onClick={(e) => e.target === ref.current && close()}
        className={
          "m-auto w-[calc(100%-2rem)] rounded-[var(--radius-xl)] bg-canvas p-0 text-ink shadow-overlay backdrop:bg-ink/30 backdrop:backdrop-blur-[2px] " +
          (wide ? "max-w-2xl" : "max-w-lg")
        }
      >
        {open && (
          <div className="max-h-[85dvh] overflow-y-auto p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
                {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
              </div>
              <button type="button" onClick={close} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {children(close)}
          </div>
        )}
      </dialog>
    </>
  );
}
