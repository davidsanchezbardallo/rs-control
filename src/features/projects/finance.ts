/** Cálculo de rentabilidad de una obra a partir de la vista v_project_financials. */
export type ProjectFinancialRow = {
  budget_amount: number | null;
  estimated_cost: number | null;
  invoiced_base: number | null;
  invoiced_total: number | null;
  collected_amount: number | null;
  certified_amount: number | null;
  material_cost: number | null;
  labor_cost: number | null;
  other_expenses: number | null;
  supplier_invoices_cost: number | null;
};

export function projectProfit(r: ProjectFinancialRow) {
  const n = (v: number | null) => Number(v ?? 0);
  const plannedIncome = n(r.budget_amount);
  const plannedCost = n(r.estimated_cost);
  const realIncome = n(r.invoiced_base);
  const realCost = n(r.material_cost) + n(r.labor_cost) + n(r.other_expenses) + n(r.supplier_invoices_cost);
  const margin = realIncome - realCost;
  return {
    plannedIncome,
    plannedCost,
    plannedMargin: plannedIncome - plannedCost,
    plannedMarginPct: plannedIncome > 0 ? (plannedIncome - plannedCost) / plannedIncome : null,
    realIncome,
    realCost,
    margin,
    marginPct: realIncome > 0 ? margin / realIncome : null,
    costDeviation: plannedCost > 0 && realCost > 0 ? (realCost - plannedCost) / plannedCost : null,
    costProgress: plannedCost > 0 ? realCost / plannedCost : null,
    collected: n(r.collected_amount),
    pendingCollection: n(r.invoiced_total) - n(r.collected_amount),
    pendingToInvoice: Math.max(0, plannedIncome - realIncome),
  };
}
