import { NextResponse, type NextRequest } from "next/server";
import { getAdminOrNull } from "@/lib/auth/session";
import { toCsv, type CsvValue } from "@/lib/utils/csv";
import { ilikeAny } from "@/lib/utils/search";
import { projectProfit } from "@/features/projects/finance";
import { INVENTORY_KIND, INVOICE_STATUS, MOVEMENT_TYPE, PROJECT_STATUS, TX_KIND } from "@/lib/labels";

/**
 * Exportaciones a Excel (CSV). Solo administración; respeta los mismos filtros
 * que la pantalla de origen. Nunca se cachea (datos privados).
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/export/[report]">) {
  const { report } = await ctx.params;
  const s = await getAdminOrNull();
  if (!s) return new NextResponse("No autorizado", { status: 403 });
  const sb = s.supabase;
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  let headers: string[] = [];
  let rows: CsvValue[][] = [];

  switch (report) {
    case "stock": {
      let q = sb.from("v_stock").select("*").eq("status", "active").order("name");
      if (sp.q) q = q.or(ilikeAny(["name", "code", "brand", "model_ref"], sp.q));
      if (sp.cat) q = q.eq("category_id", sp.cat);
      if (sp.estado === "bajo") q = q.eq("is_low", true);
      const { data } = await q;
      headers = ["Código", "Material", "Categoría", "Marca", "Referencia", "Ubicación", "Unidad", "Stock", "Mínimo", "Coste medio €", "Valor €", "Proveedor"];
      rows = (data ?? []).map((m) => [m.code, m.name, m.category_name, m.brand, m.model_ref, m.location, m.unit_code, Number(m.quantity), Number(m.min_stock), Number(m.avg_unit_cost), Number(m.stock_value), m.supplier_name]);
      break;
    }
    case "movimientos": {
      let q = sb.from("stock_movements").select("occurred_at, movement_type, is_reversal, quantity, unit_cost, total_cost, document:inventory_documents(number, kind, reference), material:materials(code, name), project:projects(code, name), employee:employees(first_name, last_name)").order("occurred_at", { ascending: false }).limit(10000);
      if (sp.obra) q = q.eq("project_id", sp.obra);
      if (sp.desde) q = q.gte("occurred_at", sp.desde);
      if (sp.hasta) q = q.lte("occurred_at", `${sp.hasta}T23:59:59`);
      const { data } = await q;
      headers = ["Fecha", "Documento", "Tipo documento", "Movimiento", "Anulación", "Código", "Material", "Cantidad", "Coste unitario €", "Importe €", "Obra", "Trabajador", "Referencia"];
      rows = (data ?? []).map((m) => [m.occurred_at.slice(0, 16).replace("T", " "), m.document?.number, m.document ? INVENTORY_KIND[m.document.kind].label : "", MOVEMENT_TYPE[m.movement_type].label, m.is_reversal ? "Sí" : "", m.material?.code, m.material?.name, Number(m.quantity), Number(m.unit_cost), Number(m.total_cost), m.project ? `${m.project.code} ${m.project.name}` : "", m.employee ? `${m.employee.first_name} ${m.employee.last_name}` : "", m.document?.reference]);
      break;
    }
    case "facturas": {
      let q = sb.from("v_invoices").select("*").order("issue_date", { ascending: false });
      if (sp.tipo) q = q.eq("direction", sp.tipo as never);
      if (sp.estado === "abiertas") q = q.in("status", ["pending", "partial", "overdue"]);
      else if (sp.estado) q = q.eq("status", sp.estado);
      if (sp.desde) q = q.gte("issue_date", sp.desde);
      if (sp.hasta) q = q.lte("issue_date", sp.hasta);
      const { data } = await q;
      headers = ["Tipo", "Número", "Emisión", "Vencimiento", "Cliente/Proveedor", "Obra", "Base €", "IVA €", "IRPF €", "Total €", "Pagado €", "Pendiente €", "Estado", "Días de retraso"];
      rows = (data ?? []).map((i) => [i.direction === "issued" ? "Emitida" : "Recibida", i.number, i.issue_date, i.due_date, i.party_name, i.project_code, Number(i.base_amount), Number(i.vat_amount), Number(i.irpf_amount), Number(i.total_amount), Number(i.paid_amount), Number(i.outstanding_amount), INVOICE_STATUS[i.status!]?.label, i.status === "overdue" ? i.days_overdue : ""]);
      break;
    }
    case "tesoreria": {
      let q = sb.from("financial_transactions").select("tx_date, amount, kind, category, description, status, account:bank_accounts(name), project:projects(code)").order("tx_date", { ascending: false });
      if (sp.cuenta) q = q.eq("account_id", sp.cuenta);
      if (sp.desde) q = q.gte("tx_date", sp.desde);
      if (sp.hasta) q = q.lte("tx_date", sp.hasta);
      const { data } = await q;
      headers = ["Fecha", "Cuenta", "Tipo", "Categoría", "Concepto", "Obra", "Importe €", "Estado"];
      rows = (data ?? []).map((t) => [t.tx_date, t.account?.name, TX_KIND[t.kind], t.category, t.description, t.project?.code, Number(t.amount), t.status === "void" ? "Anulado" : "Confirmado"]);
      break;
    }
    case "obras": {
      const { data } = await sb.from("v_project_financials").select("*").order("code", { ascending: false });
      headers = ["Código", "Obra", "Estado", "Presupuesto €", "Coste previsto €", "Facturado €", "Cobrado €", "Material €", "Mano de obra €", "Otros gastos €", "Facturas proveedores €", "Coste real €", "Margen €", "Margen %", "Desviación coste %"];
      rows = (data ?? []).map((p) => {
        const f = projectProfit(p);
        return [p.code, p.name, PROJECT_STATUS[p.status!].label, f.plannedIncome, f.plannedCost, f.realIncome, f.collected, Number(p.material_cost), Number(p.labor_cost), Number(p.other_expenses), Number(p.supplier_invoices_cost), f.realCost, f.margin, f.marginPct === null ? "" : Math.round(f.marginPct * 1000) / 10, f.costDeviation === null ? "" : Math.round(f.costDeviation * 1000) / 10];
      });
      break;
    }
    case "consumo": {
      // Consumo neto de material por obra y trabajador en un periodo
      let q = sb.from("stock_movements").select("project_delta, unit_cost, occurred_at, material:materials(code, name), project:projects(code, name), employee:employees(first_name, last_name)").neq("project_delta", 0).limit(20000);
      if (sp.desde) q = q.gte("occurred_at", sp.desde);
      if (sp.hasta) q = q.lte("occurred_at", `${sp.hasta}T23:59:59`);
      const { data } = await q;
      const agg = new Map<string, CsvValue[]>();
      for (const m of data ?? []) {
        const k = `${m.project?.code}|${m.employee?.first_name ?? ""}|${m.material?.code}`;
        const r = agg.get(k) ?? [m.project?.code, m.project?.name, m.employee ? `${m.employee.first_name} ${m.employee.last_name}` : "", m.material?.code, m.material?.name, 0, 0];
        r[5] = Number(r[5]) + Number(m.project_delta);
        r[6] = Number(r[6]) + Number(m.project_delta) * Number(m.unit_cost);
        agg.set(k, r);
      }
      headers = ["Obra", "Nombre obra", "Trabajador", "Código", "Material", "Cantidad neta", "Coste €"];
      rows = [...agg.values()];
      break;
    }
    default:
      return new NextResponse("Informe no encontrado", { status: 404 });
  }
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rs-control-${report}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
