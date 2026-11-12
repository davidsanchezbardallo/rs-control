/**
 * Formatos españoles centralizados (idioma es-ES, EUR, Europe/Madrid).
 * Todo importe, fecha o número que se muestre en pantalla debe pasar por aquí
 * para garantizar coherencia en toda la aplicación.
 *
 * Nota técnica: en español, Intl no agrupa miles en números de 4 cifras
 * (1234 -> "1234"). Se fuerza `useGrouping: "always"` para obtener "1.234".
 */

export const LOCALE = "es-ES";
export const TIME_ZONE = "Europe/Madrid";
export const CURRENCY = "EUR";

const currencyFmt = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

const currencyCompactFmt = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
  useGrouping: "always",
});

const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const monthShortFmt = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: TIME_ZONE });

/** 1234.5 -> "1.234,50 €" */
export function formatCurrency(value: number): string {
  return currencyFmt.format(value);
}

/** 1234.5 -> "1.235 €" (para tarjetas y gráficos) */
export function formatCurrencyRounded(value: number): string {
  return currencyCompactFmt.format(value);
}

/** 1234.567 -> "1.234,57"; decimales configurables (cantidades de material, metros…) */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
    useGrouping: "always",
  }).format(value);
}

/** 0.1234 -> "12,3 %" */
export function formatPercent(ratio: number, decimals = 1): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

/** Date | ISO -> "12/11/2026" (siempre en hora de Madrid) */
export function formatDate(value: Date | string): string {
  return dateFmt.format(typeof value === "string" ? new Date(value) : value);
}

/** Date | ISO -> "12/11/2026, 09:30" */
export function formatDateTime(value: Date | string): string {
  return dateTimeFmt.format(typeof value === "string" ? new Date(value) : value);
}

/** Date -> "nov" */
export function formatMonthShort(value: Date): string {
  return monthShortFmt.format(value).replace(".", "");
}

/** "ES9121000418450200051332" -> "ES91 •••• •••• •••• •••• 1332" */
export function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, "").toUpperCase();
  if (clean.length < 8) return "••••";
  return `${clean.slice(0, 4)} •••• •••• •••• •••• ${clean.slice(-4)}`;
}
