"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Minus, PackagePlus, Plus, Search, Trash2, X } from "lucide-react";
import { searchMaterials, type MaterialOption } from "../search";
import { formatNumber } from "@/lib/utils/format";
import { parseDecimal } from "@/lib/validations/common";
import { cn } from "@/lib/utils/cn";

type Mode = "request" | "issue" | "purchase" | "return";

type Line = {
  key: string;
  material_id?: string;
  free_text?: string;
  name: string;
  code?: string;
  unit: string;
  decimals: boolean;
  max?: number;            // disponible (salida) o retirado (devolución)
  quantity: string;
  unit_cost?: string;
  condition?: "ok" | "damaged";
};

export type FixedOption = { material_id: string; code: string; name: string; unit_code: string; allows_decimals: boolean; max: number };

/**
 * Editor de líneas de material. Escribe en un campo oculto `lines` (JSON)
 * que valida el servidor. Pensado para usarse con el dedo en el móvil.
 */
export function LinesEditor({
  mode,
  name = "lines",
  fixedOptions,
  initial = [],
  error,
}: {
  mode: Mode;
  name?: string;
  fixedOptions?: FixedOption[];
  initial?: Line[];
  error?: string | string[];
}) {
  const [lines, setLines] = useState<Line[]>(initial);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MaterialOption[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (fixedOptions) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => setResults(await searchMaterials(query)));
    }, 220);
    return () => clearTimeout(timer.current);
  }, [query, fixedOptions]);

  const add = (l: Omit<Line, "key" | "quantity"> & { quantity?: string }) => {
    setLines((prev) => {
      if (l.material_id && prev.some((p) => p.material_id === l.material_id)) return prev;
      return [...prev, { key: crypto.randomUUID(), quantity: l.quantity ?? "1", ...l }];
    });
    setQuery("");
    setOpen(false);
  };
  const update = (key: string, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const json = useMemo(
    () =>
      JSON.stringify(
        lines.map((l) => ({
          material_id: l.material_id,
          free_text: l.free_text,
          quantity: parseDecimal(l.quantity || "0"),
          unit_cost: mode === "purchase" ? parseDecimal(l.unit_cost || "0") : undefined,
          condition: mode === "return" ? (l.condition ?? "ok") : undefined,
        })),
      ),
    [lines, mode],
  );

  const err = Array.isArray(error) ? error[0] : error;
  const available = fixedOptions?.filter((o) => !lines.some((l) => l.material_id === o.material_id));

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={lines.length ? json : ""} />

      {/* Buscador */}
      {!fixedOptions && (
        <div className="relative">
          <label className="relative block">
            <span className="sr-only">Buscar material</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-subtle" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Buscar material por nombre, código o marca…"
              autoComplete="off"
              className="h-12 w-full rounded-[var(--radius-lg)] bg-surface pr-4 pl-11 text-[16px] text-ink placeholder:text-subtle focus:bg-canvas focus:ring-2 focus:ring-brand-500 focus:outline-none"
              aria-controls="material-results"
            />
          </label>
          {open && (
            <div id="material-results" className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-[var(--radius-lg)] bg-canvas shadow-overlay ring-1 ring-line">
              <div className="flex items-center justify-between px-4 pt-3 pb-1 text-[12px] text-muted">
                <span>{pending ? "Buscando…" : `${results.length} resultados`}</span>
                <button type="button" onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface" aria-label="Cerrar resultados">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul>
                {results.map((m) => {
                  const noStock = mode === "issue" && m.available <= 0;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={noStock}
                        onClick={() =>
                          add({ material_id: m.id, name: m.name, code: m.code, unit: m.unit_code, decimals: m.allows_decimals, max: mode === "issue" ? m.available : undefined, unit_cost: mode === "purchase" ? "" : undefined })
                        }
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface disabled:opacity-50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] text-ink">{m.name}</span>
                          <span className="block text-[12px] text-muted">
                            {m.code}
                            {m.brand ? ` · ${m.brand}` : ""}
                            {m.category_name ? ` · ${m.category_name}` : ""}
                          </span>
                        </span>
                        <span className={cn("shrink-0 text-right text-[12px]", m.available > 0 ? "text-ink-2" : "text-danger")}>
                          {m.available > 0 ? `${formatNumber(m.available)} ${m.unit_code}` : "Sin stock"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {mode === "request" && query.trim().length > 2 && (
                <button
                  type="button"
                  onClick={() => add({ free_text: query.trim(), name: query.trim(), unit: "ud", decimals: false })}
                  className="flex w-full items-center gap-2 border-t border-line px-4 py-3 text-left text-[14px] text-brand-600 hover:bg-surface"
                >
                  <PackagePlus className="h-4 w-4" /> Pedir «{query.trim()}» (no está en el catálogo)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lista fija (devoluciones: lo que el trabajador tiene retirado) */}
      {available && available.length > 0 && (
        <div className="rounded-[var(--radius-lg)] bg-surface p-2">
          <p className="px-2 pt-1 pb-2 text-[12px] font-medium text-muted">Material retirado para esta obra</p>
          <ul className="space-y-1">
            {available.map((o) => (
              <li key={o.material_id}>
                <button
                  type="button"
                  onClick={() => add({ material_id: o.material_id, name: o.name, code: o.code, unit: o.unit_code, decimals: o.allows_decimals, max: o.max, condition: "ok" })}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-md)] bg-canvas px-3 py-2.5 text-left ring-1 ring-line/70 hover:ring-brand-300"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{o.name}</span>
                    <span className="block text-[12px] text-muted">
                      Retirado: {formatNumber(o.max)} {o.unit_code}
                    </span>
                  </span>
                  <Plus className="h-5 w-5 text-brand-600" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {fixedOptions && fixedOptions.length === 0 && (
        <p className="rounded-[var(--radius-md)] bg-surface px-4 py-3 text-[14px] text-muted">No tienes material retirado pendiente de devolver en esta obra.</p>
      )}

      {/* Líneas */}
      {lines.length > 0 && (
        <ul className="divide-y divide-line rounded-[var(--radius-lg)] ring-1 ring-line">
          {lines.map((l) => {
            const q = parseDecimal(l.quantity || "0");
            const over = l.max !== undefined && q > l.max;
            const step = l.decimals ? 0.5 : 1;
            return (
              <li key={l.key} className="space-y-2.5 p-3.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug font-medium text-ink">{l.name}</p>
                    <p className="text-[12px] text-muted">
                      {l.code ?? "No catalogado"}
                      {l.max !== undefined && ` · ${mode === "return" ? "Retirado" : "Disponible"}: ${formatNumber(l.max)} ${l.unit}`}
                    </p>
                  </div>
                  <button type="button" onClick={() => remove(l.key)} aria-label={`Quitar ${l.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center rounded-[var(--radius-md)] bg-surface">
                    <button type="button" aria-label="Menos" onClick={() => update(l.key, { quantity: String(Math.max(step, q - step)).replace(".", ",") })} className="grid h-11 w-11 place-items-center text-ink-2">
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      inputMode={l.decimals ? "decimal" : "numeric"}
                      aria-label={`Cantidad de ${l.name}`}
                      value={l.quantity}
                      onChange={(e) => update(l.key, { quantity: e.target.value })}
                      className={cn("tabular h-11 w-20 bg-transparent text-center text-[16px] font-medium text-ink focus:outline-none", over && "text-danger")}
                    />
                    <button type="button" aria-label="Más" onClick={() => update(l.key, { quantity: String(q + step).replace(".", ",") })} className="grid h-11 w-11 place-items-center text-ink-2">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-[14px] text-muted">{l.unit}</span>
                  {mode === "purchase" && (
                    <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
                      Precio unidad (€)
                      <input
                        inputMode="decimal"
                        required
                        value={l.unit_cost ?? ""}
                        onChange={(e) => update(l.key, { unit_cost: e.target.value })}
                        placeholder="0,00"
                        className="tabular h-11 w-28 rounded-[var(--radius-md)] bg-surface px-3 text-right text-[15px] text-ink focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </label>
                  )}
                  {mode === "return" && (
                    <div className="ml-auto flex rounded-[var(--radius-md)] bg-surface p-1 text-[13px]" role="radiogroup" aria-label="Estado del material">
                      {(["ok", "damaged"] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={(l.condition ?? "ok") === c}
                          onClick={() => update(l.key, { condition: c })}
                          className={cn("h-9 rounded-[var(--radius-sm)] px-3", (l.condition ?? "ok") === c ? "bg-canvas font-medium text-ink shadow-card" : "text-muted")}
                        >
                          {c === "ok" ? "Apto" : "Dañado"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {over && <p className="text-[13px] text-danger">Supera lo {mode === "return" ? "retirado" : "disponible"} ({formatNumber(l.max!)} {l.unit}).</p>}
              </li>
            );
          })}
        </ul>
      )}
      {lines.length === 0 && !fixedOptions && <p className="text-[13px] text-muted">Busca y añade los materiales.</p>}
      {err && <p className="text-[13px] text-danger">{err}</p>}
    </div>
  );
}
