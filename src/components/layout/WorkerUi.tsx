import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold tracking-wide text-muted uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function BigAction({ href, icon, title, subtitle, primary = false, badge }: { href: string; icon: ReactNode; title: string; subtitle?: string; primary?: boolean; badge?: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-4 rounded-[var(--radius-xl)] p-4 transition-transform active:scale-[0.99]",
        primary ? "bg-brand-600 text-white shadow-raised" : "bg-canvas text-ink shadow-card ring-1 ring-line/70",
      )}
    >
      <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-lg)]", primary ? "bg-white/15" : "bg-brand-50 text-brand-600")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold">{title}</span>
        {subtitle && <span className={cn("block text-[14px]", primary ? "text-white/75" : "text-muted")}>{subtitle}</span>}
      </span>
      {badge}
      <ChevronRight className={cn("h-5 w-5 shrink-0", primary ? "text-white/70" : "text-subtle")} aria-hidden="true" />
    </Link>
  );
}

export function OkBanner({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-success-soft px-4 py-3 text-[15px] font-medium text-success">
      <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export function ListRow({ href, title, subtitle, right }: { href?: string; title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink">{title}</p>
        {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
      </div>
      {right}
      {href && <ChevronRight className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />}
    </>
  );
  return href ? (
    <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-surface">{inner}</Link>
  ) : (
    <div className="flex min-h-16 items-center gap-3 px-4 py-3">{inner}</div>
  );
}
