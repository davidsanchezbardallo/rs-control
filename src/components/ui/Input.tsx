import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils/cn";

type Props = ComponentProps<"input"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  leading?: ReactNode;
};

/** Campo de formulario con etiqueta, ayuda y error accesibles. */
export function Input({ label, hint, error, leading, className, id, ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={inputId} className="block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-subtle">{leading}</span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full rounded-[var(--radius-md)] bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle",
            "ring-1 ring-inset ring-transparent transition-shadow duration-150",
            "focus:bg-canvas focus:ring-2 focus:ring-brand-500 focus:outline-none",
            error && "ring-danger/60",
            leading ? "pl-10" : undefined,
          )}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
