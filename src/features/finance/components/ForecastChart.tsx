"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrencyRounded, formatDate } from "@/lib/utils/format";

const compact = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 0 });

/** Saldo previsto día a día (una sola serie, con línea de saldo mínimo de seguridad). */
export function ForecastChart({ data, threshold }: { data: { date: string; balance: number }[]; threshold: number }) {
  return (
    <div className="h-64" role="img" aria-label="Evolución prevista del saldo de tesorería">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
          <defs>
            <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-series-1)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--color-series-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted)", fontSize: 12 }} tickFormatter={(d: string) => formatDate(d).slice(0, 5)} minTickGap={32} />
          <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: "var(--color-muted)", fontSize: 12 }} tickFormatter={(v: number) => compact.format(v)} />
          <ReferenceLine y={threshold} stroke="var(--color-danger)" strokeDasharray="4 4" label={{ value: "Mínimo de seguridad", position: "insideTopRight", fill: "var(--color-danger)", fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-[var(--radius-md)] bg-canvas px-3 py-2 text-[13px] shadow-raised ring-1 ring-line">
                  <p className="text-muted">{formatDate(String(payload[0]!.payload.date))}</p>
                  <p className="tabular font-medium text-ink">{formatCurrencyRounded(Number(payload[0]!.value))}</p>
                </div>
              ) : null
            }
          />
          <Area type="stepAfter" dataKey="balance" stroke="var(--color-series-1)" strokeWidth={2} fill="url(#fc)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
