import { Search } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Barra de búsqueda y filtros mediante formulario GET: los filtros quedan en
 * la URL (se pueden compartir y funcionan con "atrás").
 */
export function FilterBar({ action, q, placeholder = "Buscar…", children }: { action: string; q?: string; placeholder?: string; children?: ReactNode }) {
  return (
    <form action={action} method="get" className="flex flex-col gap-2 px-5 pt-4 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
      <label className="relative min-w-0 flex-1 sm:max-w-sm">
        <span className="sr-only">Buscar</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="h-10 w-full rounded-[var(--radius-md)] bg-surface pr-3 pl-9 text-[14px] text-ink placeholder:text-subtle focus:bg-canvas focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </label>
      {children}
      <button type="submit" className="h-10 rounded-[var(--radius-md)] px-4 text-[14px] font-medium text-brand-600 ring-1 ring-inset ring-line hover:bg-surface">
        Filtrar
      </button>
    </form>
  );
}

export function FilterSelect({ name, value, options, label }: { name: string; value?: string; label: string; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="h-10 w-full rounded-[var(--radius-md)] bg-surface px-3 text-[14px] text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none sm:w-auto"
      >
        <option value="">{label}: todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
