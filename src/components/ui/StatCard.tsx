import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Card } from "./Card";

/** Tarjeta de indicador (KPI): etiqueta, valor principal y contexto. */
export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: LucideIcon;
  emphasis?: "warning" | "danger";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {Icon && (
          <span
            className={cn(
              "grid h-8 w-8 place-items-center rounded-[var(--radius-sm)]",
              emphasis === "warning"
                ? "bg-warning-soft text-warning"
                : emphasis === "danger"
                  ? "bg-danger-soft text-danger"
                  : "bg-brand-50 text-brand-600",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="tabular mt-3 text-[26px] leading-none font-semibold tracking-tight text-ink">{value}</p>
      {detail && <div className="mt-2 text-[13px] text-muted">{detail}</div>}
    </Card>
  );
}
