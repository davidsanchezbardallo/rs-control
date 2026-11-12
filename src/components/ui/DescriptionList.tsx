import type { ReactNode } from "react";

/** Lista de datos "etiqueta: valor" para fichas. */
export function DescriptionList({ items, columns = 2 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 | 3 }) {
  const cols = columns === 1 ? "" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <dl className={`grid gap-x-8 gap-y-4 ${cols}`}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-[12px] font-medium text-muted">{i.label}</dt>
          <dd className="mt-0.5 text-[14px] break-words text-ink">{i.value ?? <span className="text-muted">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
