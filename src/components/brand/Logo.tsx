import { cn } from "@/lib/utils/cn";

/**
 * Logotipo oficial de RS Instalaciones XXI, redibujado en vectorial (SVG)
 * a partir del original para que se vea nítido a cualquier tamaño.
 * Colores corporativos exactos: azul #283582 y rojo #E2070F.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="8 18 262 246" aria-hidden="true" className={cn("h-9 w-9 shrink-0", className)}>
      <polygon fill="#FFFFFF" points="150,77 85,147 145,150 124,205 192,133.5 133.5,131 155,77" />
      <path
        fill="#283582"
        d="M150 77 L85 147 L145 150 L102 257 C100 236 78 214 50 198 C26 184 15 166 15 145 C15 108 58 75 110 74 C126 73.5 140 74.5 150 77 Z"
      />
      <path
        fill="#E2070F"
        d="M177 24 L133.5 131 L192 133.5 L124 205 C168 211 226 196 249 168 C258 157 262 146 262 134 C262 104 236 80 206 62 C189 51 180 41 177 24 Z"
      />
    </svg>
  );
}

export function Logo({ className, compact = false, inverted = false }: { className?: string; compact?: boolean; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="leading-none">
          <span className={cn("block text-[15px] font-semibold tracking-tight", inverted ? "text-white" : "text-ink")}>
            RS <span className={inverted ? "text-white/80" : "text-brand-600"}>CONTROL</span>
          </span>
          <span className={cn("mt-0.5 block text-[11px] font-medium", inverted ? "text-white/60" : "text-muted")}>
            RS Instalaciones XXI
          </span>
        </span>
      )}
    </span>
  );
}
