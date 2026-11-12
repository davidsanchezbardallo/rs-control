import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils/cn";

const control =
  "w-full rounded-[var(--radius-md)] bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle ring-1 ring-inset ring-transparent " +
  "transition-shadow duration-150 focus:bg-canvas focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:opacity-60";

type Common = { label: string; hint?: ReactNode; error?: string | string[]; className?: string };

function Wrap({ id, label, hint, error, className, children }: Common & { id: string; children: ReactNode }) {
  const err = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {err ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {err}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({ label, hint, error, className, id, ...props }: Common & ComponentProps<"input">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} className={className}>
      <input id={fid} aria-invalid={error ? true : undefined} className={cn(control, "h-11")} {...props} />
    </Wrap>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  id,
  options,
  placeholder,
  ...props
}: Common & ComponentProps<"select"> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} className={className}>
      <select id={fid} aria-invalid={error ? true : undefined} className={cn(control, "h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9")} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function TextAreaField({ label, hint, error, className, id, ...props }: Common & ComponentProps<"textarea">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} className={className}>
      <textarea id={fid} rows={3} aria-invalid={error ? true : undefined} className={cn(control, "min-h-24 py-2.5")} {...props} />
    </Wrap>
  );
}

export function CheckboxField({ label, className, ...props }: { label: string; className?: string } & ComponentProps<"input">) {
  return (
    <label className={cn("flex items-center gap-2.5 text-[14px] text-ink-2", className)}>
      <input type="checkbox" className="h-4 w-4 rounded accent-brand-600" {...props} />
      {label}
    </label>
  );
}
