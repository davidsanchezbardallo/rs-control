import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClassifyDialog, LinkButton, ManualLinkDialog } from "@/features/banking/components/forms";
import { NotAccounting, TreasuryTabs } from "@/features/finance/components/TreasuryTabs";
import { suggest, type Candidate } from "@/features/banking/reconcile";
import { projectOptions } from "@/features/lookups";
import { daysFromToday } from "@/lib/utils/dates";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Conciliación" };

/**
 * Movimientos del banco pendientes de casar con facturas, con propuestas automáticas.
 * Con ?factura=ID muestra los movimientos que podrían corresponder a esa factura.
 */
export default async function Page(props: PageProps<"/tesoreria/conciliacion">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const { supabase } = await requireAdmin();
  const [{ data: txs }, { data: open }, projects] = await Promise.all([
    supabase
      .from("v_transactions_reconciliation")
      .select("id, tx_date, amount, description, counterparty_name, category, project_id, account_name, unlinked_amount, linked_amount")
      .eq("source", "bank")
      .eq("status", "confirmed")
      .gt("unlinked_amount", 0.005)
      .gte("tx_date", daysFromToday(-180))
      .order("tx_date", { ascending: false })
      .limit(150),
    supabase.from("v_invoices").select("id, number, direction, party_name, outstanding_amount, guarantee_amount, issue_date, due_date").in("status", ["pending", "partial", "overdue"]),
  ]).then(async (r) => [...r, await projectOptions(supabase)] as const);

  const candidates: Candidate[] = (open ?? []).map((i) => ({
    id: i.id!, number: i.number!, direction: i.direction!, party_name: i.party_name, outstanding: Number(i.outstanding_amount),
    guarantee: Number(i.guarantee_amount ?? 0), issue_date: i.issue_date!, due_date: i.due_date,
  }));
  const invoiceOptions = (dir: "issued" | "received") =>
    candidates.filter((c) => c.direction === dir).map((c) => ({ value: c.id, label: `${c.number} · ${c.party_name ?? ""} · pendiente ${formatCurrency(c.outstanding)}` }));
  const focus = sp.factura ? candidates.find((c) => c.id === sp.factura) : undefined;

  let rows = (txs ?? []).map((t) => {
    const m = { amount: Number(t.amount), tx_date: t.tx_date!, description: t.description ?? "", counterparty_name: t.counterparty_name };
    return { t, m, sug: focus ? suggest(m, [focus], 1) : suggest(m, candidates) };
  });
  if (focus) rows = rows.filter((r) => (r.m.amount > 0) === (focus.direction === "issued")).sort((a, b) => (b.sug[0]?.score ?? 0) - (a.sug[0]?.score ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader title="Tesorería y finanzas" description="Casa los movimientos del banco con las facturas para que cobros y pagos se actualicen solos." />
      <TreasuryTabs active="/tesoreria/conciliacion" />
      {sp.msg && <p role="status" className="flex items-center gap-2 rounded-[var(--radius-md)] bg-success-soft px-4 py-3 text-[14px] text-success"><CheckCircle2 className="h-4 w-4" />{sp.msg}</p>}
      {focus && (
        <Card className="flex flex-wrap items-center gap-3 p-4 text-[14px]">
          <span>Buscando el {focus.direction === "issued" ? "cobro" : "pago"} de la factura <Link className="font-medium text-brand-600" href={`/facturas/${focus.id}`}>{focus.number}</Link> · {focus.party_name} · pendiente <span className="tabular font-medium">{formatCurrency(focus.outstanding)}</span></span>
          <Link href="/tesoreria/conciliacion" className="ml-auto text-[13px] text-muted hover:text-ink">Ver todos</Link>
        </Card>
      )}
      {!rows.length ? (
        <Card><EmptyState icon={CheckCircle2} title="Todo conciliado" description="No hay movimientos del banco pendientes de casar con facturas (o aún no hay bancos conectados)." /></Card>
      ) : (
        <div className="space-y-3">
          {rows.map(({ t, m, sug }) => (
            <Card key={t.id!}>
              <CardBody className="space-y-3 pt-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink">{t.description}</p>
                    <p className="text-[12px] text-muted">{formatDate(t.tx_date!)} · {t.account_name}{t.counterparty_name ? ` · ${t.counterparty_name}` : ""}{t.category ? ` · ${t.category}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className={`tabular text-[16px] font-semibold ${m.amount > 0 ? "text-success" : "text-ink"}`}>{formatCurrency(m.amount)}</p>
                    {Number(t.linked_amount) > 0 && <p className="text-[12px] text-muted">Sin conciliar {formatCurrency(Number(t.unlinked_amount))}</p>}
                  </div>
                </div>
                {sug.length > 0 && (
                  <ul className="space-y-1.5">
                    {sug.map(({ c, score }) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-surface px-3 py-2 text-[13px]">
                        <Sparkles className="h-4 w-4 text-brand-500" aria-hidden="true" />
                        <span className="text-ink">Factura <Link className="font-medium text-brand-600" href={`/facturas/${c.id}`}>{c.number}</Link> · {c.party_name} · pendiente {formatCurrency(c.outstanding)}</span>
                        <Badge tone={score >= 70 ? "success" : "warning"}>{score >= 70 ? "Coincidencia alta" : "Posible"}</Badge>
                        <span className="ml-auto"><LinkButton invoiceId={c.id} transactionId={t.id!} /></span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap justify-end gap-1">
                  <ManualLinkDialog transactionId={t.id!} invoices={invoiceOptions(m.amount > 0 ? "issued" : "received")} />
                  <ClassifyDialog id={t.id!} category={t.category} projectId={t.project_id} projects={projects} />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <NotAccounting />
    </div>
  );
}
