import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const PAGE_SIZE = 25;

export function pageRange(page: number) {
  const from = (Math.max(1, page) - 1) * PAGE_SIZE;
  return { from, to: from + PAGE_SIZE - 1 };
}

/** Paginación que conserva los filtros de la URL. */
export function Pagination({ page, total, params, basePath }: { page: number; total: number; params: Record<string, string | undefined>; basePath: string }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v);
    q.set("page", String(p));
    return `${basePath}?${q.toString()}`;
  };
  const btn = "inline-flex h-9 items-center gap-1 rounded-[var(--radius-md)] px-3 text-[13px] ring-1 ring-inset ring-line hover:bg-surface";
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 text-[13px] text-muted sm:px-6">
      <span>
        Página {page} de {pages} · {total} registros
      </span>
      <div className="flex gap-2">
        <Link aria-disabled={page <= 1} className={cn(btn, page <= 1 && "pointer-events-none opacity-40")} href={href(page - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior
        </Link>
        <Link aria-disabled={page >= pages} className={cn(btn, page >= pages && "pointer-events-none opacity-40")} href={href(page + 1)}>
          Siguiente <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
