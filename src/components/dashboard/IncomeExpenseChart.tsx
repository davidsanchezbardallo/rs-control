"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrencyRounded } from "@/lib/utils/format";

type Point = { month: string; income: number; expense: number };

const SERIES = [
  { key: "income", label: "Ingresos", color: "var(--color-series-1)" },
  { key: "expense", label: "Gastos", color: "var(--color-series-2)" },
] as const;

const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 0 });

/**
 * Ingresos vs gastos por mes (columnas agrupadas, un solo eje).
 * Colores validados para daltonismo; leyenda siempre visible y tooltip con
 * importes exactos (el color nunca es la única forma de identificar la serie).
 */
export function IncomeExpenseChart({ data }: { data: Point[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
      <ul className="flex gap-5 text-[13px] text-ink-2" aria-label="Leyenda">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
      <span className="text-[12px] text-muted">Importes en euros</span>
      </div>
      <div className="h-64" role="img" aria-label="Gráfico de ingresos y gastos de los últimos seis meses">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" strokeWidth={1} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              tickFormatter={(v: number) => (v === 0 ? "0" : compact.format(v))}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-[var(--radius-md)] bg-canvas px-3 py-2.5 text-[13px] shadow-raised ring-1 ring-line">
                    <p className="mb-1.5 font-medium text-ink capitalize">{label}</p>
                    {SERIES.map((s) => {
                      const p = payload.find((x) => x.dataKey === s.key);
                      return (
                        <p key={s.key} className="flex items-center justify-between gap-6 text-ink-2">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} aria-hidden="true" />
                            {s.label}
                          </span>
                          <span className="tabular font-medium text-ink">{formatCurrencyRounded(Number(p?.value ?? 0))}</span>
                        </p>
                      );
                    })}
                  </div>
                ) : null
              }
            />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={22} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
