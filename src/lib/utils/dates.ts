/**
 * Fechas "de calendario" (AAAA-MM-DD) en hora de Madrid.
 * Centraliza el uso de la hora actual para que los componentes no la lean directamente.
 */
export function isoDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);
}

/** Hoy + n días, en formato AAAA-MM-DD (n puede ser negativo). */
export function daysFromToday(n = 0): string {
  return isoDate(new Date(Date.now() + n * 86_400_000));
}

/** Estado de un vencimiento: caducado, próximo (dentro de `window` días) o en plazo. */
export function dueTone(date: string | null | undefined, window = 30): "danger" | "warning" | "neutral" {
  if (!date) return "neutral";
  if (date < daysFromToday(0)) return "danger";
  return date <= daysFromToday(window) ? "warning" : "neutral";
}
