/**
 * Une clases CSS condicionales en una sola cadena.
 * Ej.: cn("base", activo && "activo", undefined) -> "base activo"
 * (Alternativa mínima a librerías como clsx, sin dependencia extra.)
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
