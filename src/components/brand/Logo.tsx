import { cn } from "@/lib/utils/cn";

/**
 * Logotipo PROVISIONAL tipográfico de RS CONTROL.
 * Cuando RS facilite su logotipo oficial (SVG preferiblemente), se sustituye
 * únicamente este componente y los iconos de /public/icons.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("h-8 w-8 shrink-0", className)}>
      <rect width="40" height="40" rx="10" className="fill-brand-600" />
      <text
        x="20"
        y="26.5"
        textAnchor="middle"
        className="fill-white"
        style={{ font: "700 17px var(--font-sans)", letterSpacing: "-0.5px" }}
      >
        RS
      </text>
      <rect x="11" y="31" width="18" height="2.5" rx="1.25" className="fill-accent-500" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="leading-none">
          <span className="block text-[15px] font-semibold tracking-tight text-ink">
            RS <span className="text-brand-600">CONTROL</span>
          </span>
          <span className="mt-0.5 block text-[11px] font-medium text-muted">RS Instalaciones XXI</span>
        </span>
      )}
    </span>
  );
}
