import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-[var(--radius-lg)] bg-surface text-muted">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-[14px] text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
