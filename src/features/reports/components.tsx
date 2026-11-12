import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { PrintButton } from "@/components/ui/PrintButton";
import { Tabs } from "@/components/ui/Tabs";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { daysFromToday } from "@/lib/utils/dates";

export function ReportTabs({ active }: { active: string }) {
  return (
    <div className="print:hidden">
      <Tabs active={active} items={[{ href: "/informes", label: "Resumen" }, { href: "/informes/almacen", label: "Almacén" }, { href: "/informes/obras", label: "Obras" }, { href: "/informes/finanzas", label: "Finanzas" }, { href: "/informes/personal", label: "Personal" }]} />
    </div>
  );
}

/** Selector de periodo (atajos + fechas) que conserva la ruta. */
export function PeriodBar({ path, desde, hasta, exportHref }: { path: string; desde: string; hasta: string; exportHref?: string }) {
  const y = new Date().getFullYear();
  const quick = [
    { label: "Este año", d: `${y}-01-01`, h: `${y}-12-31` },
    { label: "Año anterior", d: `${y - 1}-01-01`, h: `${y - 1}-12-31` },
    { label: "Últimos 90 días", d: daysFromToday(-90), h: daysFromToday(0) },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {quick.map((q) => (
        <Link key={q.label} href={`${path}?desde=${q.d}&hasta=${q.h}`} className={`h-9 rounded-full px-3.5 text-[13px] leading-9 ring-1 ring-inset ${q.d === desde && q.h === hasta ? "bg-brand-600 text-white ring-brand-600" : "text-ink-2 ring-line hover:bg-surface"}`}>{q.label}</Link>
      ))}
      <form action={path} className="flex items-center gap-2">
        <input type="date" name="desde" defaultValue={desde} aria-label="Desde" className="h-9 rounded-[var(--radius-md)] bg-surface px-3 text-[13px]" />
        <span className="text-muted">→</span>
        <input type="date" name="hasta" defaultValue={hasta} aria-label="Hasta" className="h-9 rounded-[var(--radius-md)] bg-surface px-3 text-[13px]" />
        <button className="h-9 rounded-[var(--radius-md)] px-3 text-[13px] font-medium text-brand-600 ring-1 ring-inset ring-line hover:bg-surface">Aplicar</button>
      </form>
      <div className="ml-auto flex gap-1">
        {exportHref && <ButtonLink href={exportHref} variant="ghost" size="sm" icon={<Download className="h-4 w-4" />} prefetch={false}>Excel</ButtonLink>}
        <PrintButton icon={<Printer className="h-4 w-4" />} />
      </div>
    </div>
  );
}

export function period(sp: Record<string, string | undefined>) {
  const y = new Date().getFullYear();
  return { desde: sp.desde ?? `${y}-01-01`, hasta: sp.hasta ?? `${y}-12-31` };
}

/** Barras horizontales (una sola serie) con el valor escrito: legible sin depender del color. */
export function BarList({ items, money = true, empty = "Sin datos en el periodo." }: { items: { label: React.ReactNode; value: number; detail?: string }[]; money?: boolean; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  if (!items.length) return <p className="py-6 text-center text-[14px] text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((i, k) => (
        <li key={k}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink">{i.label}</span>
            <span className="tabular shrink-0 font-medium text-ink">{money ? formatCurrency(i.value) : formatNumber(i.value)}{i.detail && <span className="ml-1.5 font-normal text-muted">{i.detail}</span>}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
            <div className="h-full rounded-full bg-[var(--color-series-1)]" style={{ width: `${(Math.abs(i.value) / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
