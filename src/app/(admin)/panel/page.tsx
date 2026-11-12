import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowDownToLine, ArrowRight, Boxes, CircleAlert, FileClock, HardHat, Inbox, Landmark, PackageCheck, Plus, ReceiptEuro, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { bankTotal, monthStart, monthlyIncomeExpense } from "@/features/dashboard/queries";
import { projectProfit } from "@/features/projects/finance";
import { ACTIVE_PROJECT_STATUSES, PROJECT_STATUS } from "@/lib/labels";
import { formatCurrencyRounded, formatDate, formatDateTime, formatNumber, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Panel de control" };

const activityIcon: Record<string, typeof Inbox> = {
  purchase: ArrowDownToLine, issue: PackageCheck, return: PackageCheck, adjustment: Boxes, reversal: Boxes,
  request: Inbox, incident: AlertTriangle, invoice: FileClock, income: ReceiptEuro, expense: Wallet, project: HardHat,
};
const toneCls = { brand: "bg-brand-50 text-brand-600", warning: "bg-warning-soft text-warning", danger: "bg-danger-soft text-danger" } as const;

export default async function PanelPage() {
  const { supabase, profile } = await requireAdmin();
  const thisMonth = monthStart(0);
  const [bank, monthly, { data: invoices }, { data: projects }, { count: employees }, { data: stock }, { count: pendingReq }, { count: openInc }, { data: alerts }, { data: activity }, { data: monthTx }] = await Promise.all([
    bankTotal(supabase),
    monthlyIncomeExpense(supabase),
    supabase.from("v_invoices").select("direction, outstanding_amount, status").in("status", ["pending", "partial", "overdue"]),
    supabase.from("v_project_financials").select("*").in("status", ACTIVE_PROJECT_STATUSES).order("code"),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("v_stock").select("is_low").eq("status", "active"),
    supabase.from("material_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "in_review"]),
    supabase.from("incidents").select("id", { count: "exact", head: true }).neq("status", "resolved"),
    supabase.from("v_alerts").select("*").order("due_date", { ascending: true, nullsFirst: true }).limit(6),
    supabase.from("v_recent_activity").select("*").order("at", { ascending: false }).limit(7),
    supabase.from("financial_transactions").select("amount").eq("status", "confirmed").neq("kind", "transfer").gte("tx_date", thisMonth),
  ]);
  const income = (monthTx ?? []).filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const expense = (monthTx ?? []).filter((t) => Number(t.amount) < 0).reduce((s, t) => s - Number(t.amount), 0);
  const receivable = (invoices ?? []).filter((i) => i.direction === "issued");
  const payable = (invoices ?? []).filter((i) => i.direction === "received");
  const sum = (a: typeof receivable) => a.reduce((s, i) => s + Number(i.outstanding_amount), 0);
  const overdue = receivable.filter((i) => i.status === "overdue").length;
  const low = (stock ?? []).filter((s) => s.is_low).length;
  const firstName = profile.fullName.split(" ")[0];

  const attention = [
    ...(pendingReq ? [{ key: "req", label: `${pendingReq} ${pendingReq === 1 ? "solicitud" : "solicitudes"} de material`, detail: "Pendientes de revisar", tone: "brand" as const, href: "/almacen/solicitudes" }] : []),
    ...(openInc ? [{ key: "inc", label: `${openInc} ${openInc === 1 ? "incidencia abierta" : "incidencias abiertas"}`, detail: "Comunicadas desde obra", tone: "danger" as const, href: "/incidencias" }] : []),
    ...(alerts ?? []).map((a, i) => ({ key: `a${i}`, label: a.title!, detail: [a.detail, a.due_date ? formatDate(a.due_date) : null].filter(Boolean).join(" · "), tone: (a.tone === "danger" ? "danger" : "warning") as "danger" | "warning", href: a.link ?? "/panel" })),
  ].slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("es-ES", { dateStyle: "full", timeZone: "Europe/Madrid" }).format(new Date())}
        title={`Hola, ${firstName}`}
        description="Situación general de RS Instalaciones XXI."
        actions={
          <>
            <ButtonLink href="/almacen/entrada" variant="secondary" icon={<ArrowDownToLine className="h-4 w-4" />}>Entrada de material</ButtonLink>
            <ButtonLink href="/obras/nueva" icon={<Plus className="h-4 w-4" />}>Nueva obra</ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo en cuentas" value={formatCurrencyRounded(bank.total)} icon={Landmark} detail={`${bank.accounts} cuentas · ver previsión`} />
        <StatCard label="Ingresos del mes" value={formatCurrencyRounded(income)} icon={TrendingUp} detail={<span className={income - expense >= 0 ? "text-success" : "text-danger"}>Resultado {formatCurrencyRounded(income - expense)}</span>} />
        <StatCard label="Gastos del mes" value={formatCurrencyRounded(expense)} icon={TrendingDown} detail={`${payable.length} facturas por pagar · ${formatCurrencyRounded(sum(payable))}`} />
        <StatCard
          label="Pendiente de cobro"
          value={formatCurrencyRounded(sum(receivable))}
          icon={ReceiptEuro}
          emphasis={overdue ? "danger" : undefined}
          detail={overdue ? <span className="inline-flex items-center gap-1 text-danger"><CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />{overdue} {overdue === 1 ? "factura vencida" : "facturas vencidas"}</span> : `${receivable.length} facturas`}
        />
      </div>

      <Card>
        <dl className="grid grid-cols-2 md:grid-cols-5 md:divide-x md:divide-line">
          {[
            { label: "Obras activas", value: projects?.length ?? 0, icon: HardHat, href: "/obras" },
            { label: "Trabajadores", value: employees ?? 0, icon: Users, href: "/trabajadores" },
            { label: "Materiales", value: stock?.length ?? 0, icon: Boxes, href: "/almacen" },
            { label: "Stock bajo", value: low, icon: AlertTriangle, warn: low > 0, href: "/almacen/reposicion" },
            { label: "Solicitudes pendientes", value: pendingReq ?? 0, icon: Inbox, href: "/almacen/solicitudes" },
          ].map((m) => (
            <Link key={m.label} href={m.href} className="flex items-center gap-3 px-5 py-4 hover:bg-surface/60">
              <m.icon className={cn("h-5 w-5 shrink-0", m.warn ? "text-warning" : "text-subtle")} strokeWidth={1.8} aria-hidden="true" />
              <div>
                <dt className="text-[12px] text-muted">{m.label}</dt>
                <dd className={cn("tabular text-[20px] leading-tight font-semibold", m.warn ? "text-warning" : "text-ink")}>{formatNumber(m.value)}</dd>
              </div>
            </Link>
          ))}
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Ingresos y gastos" description="Movimientos bancarios de los últimos 6 meses (sin transferencias internas)" action={<Link href="/informes/finanzas" className="text-[13px] font-medium text-brand-600">Informe</Link>} />
          <CardBody>
            <IncomeExpenseChart data={monthly} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Requiere atención" description="Avisos que necesitan una acción" />
          <CardBody className="pt-3">
            {attention.length === 0 && <p className="py-6 text-center text-[14px] text-muted">Nada pendiente. ¡Buen trabajo!</p>}
            <ul className="space-y-1">
              {attention.map((a) => (
                <li key={a.key}>
                  <Link href={a.href} className="group -mx-2 flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 hover:bg-surface">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)]", toneCls[a.tone])}>
                      {a.tone === "danger" ? <CircleAlert className="h-4 w-4" aria-hidden="true" /> : a.tone === "warning" ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : <Inbox className="h-4 w-4" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">{a.label}</span>
                      <span className="block truncate text-[12px] text-muted">{a.detail}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader title="Obras activas" description="Coste real frente a previsto y margen sobre lo facturado" action={<Link href="/obras" className="text-[13px] font-medium text-brand-600">Ver todas</Link>} />
          <Table className="mt-3" minWidth={680}>
            <THead>
              <Th>Obra</Th>
              <Th>Estado</Th>
              <Th>Coste ejecutado</Th>
              <Th align="right">Margen real</Th>
            </THead>
            <TBody>
              {(projects ?? []).map((p) => {
                const f = projectProfit(p);
                const prog = Math.min(1, f.costProgress ?? 0);
                return (
                  <Tr key={p.project_id!}>
                    <Td>
                      <Link href={`/obras/${p.project_id}`} className="font-medium text-ink hover:text-brand-600">{p.name}</Link>
                      <p className="text-[12px] text-muted">{p.code}</p>
                    </Td>
                    <Td><Badge tone={PROJECT_STATUS[p.status!].tone}>{PROJECT_STATUS[p.status!].label}</Badge></Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                          <div className={cn("h-full rounded-full", (f.costProgress ?? 0) > 1 ? "bg-danger" : "bg-brand-500")} style={{ width: `${prog * 100}%` }} />
                        </div>
                        <span className="tabular text-[13px] text-ink-2">{f.costProgress === null ? "—" : formatPercent(f.costProgress, 0)}</span>
                      </div>
                    </Td>
                    <Td align="right" className={cn("font-medium", f.marginPct !== null && f.marginPct < 0.1 ? "text-warning" : "text-ink")}>
                      {f.marginPct === null ? <span className="text-muted">Sin facturar</span> : formatPercent(f.marginPct)}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Actividad reciente" />
          <CardBody className="pt-3">
            <ol className="space-y-4">
              {(activity ?? []).map((a, i) => {
                const Icon = activityIcon[a.kind ?? ""] ?? Inbox;
                return (
                  <li key={i}>
                    <Link href={a.link ?? "#"} className="flex gap-3 hover:opacity-80">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-ink-2"><Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="block text-[13px] text-ink">{a.summary}</span>
                        <span className="block text-[12px] text-muted">{formatDateTime(a.at!)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
