/** Construye la previsión de saldo a partir del saldo actual y los movimientos previstos. */
export type ForecastItem = { due_date: string; concept: string; amount: number; source: string; is_estimate: boolean };

export function buildForecast(current: number, items: ForecastItem[], today: string, days: number, threshold: number) {
  const end = new Date(new Date(today).getTime() + days * 86400000).toISOString().slice(0, 10);
  const rows = items
    .filter((i) => i.due_date >= today && i.due_date <= end)
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || b.amount - a.amount);
  let bal = current;
  let min = { date: today, balance: current };
  const withBalance = rows.map((r) => {
    bal += Number(r.amount);
    if (bal < min.balance) min = { date: r.due_date, balance: bal };
    return { ...r, balance: bal };
  });
  const series: { date: string; balance: number }[] = [{ date: today, balance: current }];
  for (const r of withBalance) {
    const last = series[series.length - 1]!;
    if (last.date === r.due_date) last.balance = r.balance;
    else series.push({ date: r.due_date, balance: r.balance });
  }
  if (series[series.length - 1]!.date !== end) series.push({ date: end, balance: bal });
  const inflow = rows.filter((r) => r.amount > 0).reduce((s, r) => s + Number(r.amount), 0);
  const outflow = rows.filter((r) => r.amount < 0).reduce((s, r) => s - Number(r.amount), 0);
  const firstBelow = withBalance.find((r) => r.balance < threshold);
  return { rows: withBalance, series, final: bal, min, inflow, outflow, firstBelow };
}
