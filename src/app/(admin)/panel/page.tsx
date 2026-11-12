import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Boxes,
  CircleAlert,
  FileClock,
  HardHat,
  Inbox,
  Landmark,
  PackageCheck,
  Plus,
  ReceiptEuro,
  TrendingDown,
  TrendingUp,

  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { demoActivity, demoAttention, demoKpis, demoMonthly, demoProjects } from "@/lib/demo/data";
import { PROJECT_STATUS_TONE } from "@/lib/status";
import { formatCurrencyRounded, formatNumber, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Panel de control" };

const activityIcon = {
  entrada: ArrowDownToLine,
  entrega: PackageCheck,
  solicitud: Inbox,
  factura: FileClock,
  cobro: ReceiptEuro,
  incidencia: AlertTriangle,
} as const;

const attentionTone = {
  brand: "bg-brand-50 text-brand-600",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
} as const;

export default function PanelPage() {
  const k = demoKpis;
  const result = k.incomeMonth - k.expenseMonth;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Noviembre 2026"
        title="Panel de control"
        description="Situación general de RS Instalaciones XXI."
        actions={
          <>
            <ButtonLink href="/almacen" variant="secondary" icon={<ArrowDownToLine className="h-4 w-4" />}>
              Entrada de material
            </ButtonLink>
            <ButtonLink href="/obras" icon={<Plus className="h-4 w-4" />}>
              Nueva obra
            </ButtonLink>
          </>
        }
      />

      <DemoNotice />

      {/* Indicadores financieros */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo en cuentas" value={formatCurrencyRounded(k.bankBalance)} icon={Landmark} detail="3 cuentas bancarias" />
        <StatCard
          label="Ingresos del mes"
          value={formatCurrencyRounded(k.incomeMonth)}
          icon={TrendingUp}
          detail={<span className="text-success">Resultado {formatCurrencyRounded(result)}</span>}
        />
        <StatCard label="Gastos del mes" value={formatCurrencyRounded(k.expenseMonth)} icon={TrendingDown} detail={`${k.pendingPayments} pagos pendientes`} />
        <StatCard
          label="Pendiente de cobro"
          value={formatCurrencyRounded(k.receivables)}
          icon={ReceiptEuro}
          emphasis="danger"
          detail={
            <span className="inline-flex items-center gap-1 text-danger">
              <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              {k.receivablesOverdue} facturas vencidas
            </span>
          }
        />
      </div>

      {/* Indicadores operativos */}
      <Card>
        <dl className="grid grid-cols-2 divide-line md:grid-cols-5 md:divide-x">
          {[
            { label: "Obras activas", value: k.activeProjects, icon: HardHat },
            { label: "Trabajadores", value: k.employees, icon: Users },
            { label: "Materiales en catálogo", value: k.materials, icon: Boxes },
            { label: "Stock bajo", value: k.lowStock, icon: AlertTriangle, warn: true },
            { label: "Solicitudes pendientes", value: k.pendingRequests, icon: Inbox },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-3 px-5 py-4">
              <m.icon className={cn("h-5 w-5 shrink-0", m.warn ? "text-warning" : "text-subtle")} strokeWidth={1.8} aria-hidden="true" />
              <div>
                <dt className="text-[12px] text-muted">{m.label}</dt>
                <dd className={cn("tabular text-[20px] leading-tight font-semibold", m.warn ? "text-warning" : "text-ink")}>
                  {formatNumber(m.value)}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Ingresos y gastos" description="Últimos 6 meses" />
          <CardBody>
            <IncomeExpenseChart data={demoMonthly} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Requiere atención" description="Avisos que necesitan una acción" />
          <CardBody className="pt-3">
            <ul className="space-y-1">
              {demoAttention.map((a) => (
                <li key={a.id}>
                  <Link href={a.href} className="group -mx-2 flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2.5 hover:bg-surface">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)]", attentionTone[a.tone])}>
                      {a.tone === "danger" ? (
                        <CircleAlert className="h-4 w-4" aria-hidden="true" />
                      ) : a.tone === "warning" ? (
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Inbox className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-ink">{a.label}</span>
                      <span className="block text-[12px] text-muted">{a.detail}</span>
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
          <CardHeader
            title="Obras activas"
            description="Avance y margen previsto"
            action={
              <Link href="/obras" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">
                Ver todas
              </Link>
            }
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead>
                <tr className="border-y border-line bg-surface/60 text-[12px] text-muted">
                  <th scope="col" className="py-2.5 pr-3 pl-6 font-medium">Obra</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Estado</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Avance</th>
                  <th scope="col" className="py-2.5 pr-6 pl-3 text-right font-medium">Margen previsto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {demoProjects.map((p) => (
                  <tr key={p.code} className="transition-colors hover:bg-surface/60">
                    <td className="py-3 pr-3 pl-6">
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="text-[12px] text-muted">
                        {p.code} · {p.client}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={PROJECT_STATUS_TONE[p.status]}>{p.status}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${p.progress * 100}%` }} />
                        </div>
                        <span className="tabular text-[13px] text-ink-2">{formatPercent(p.progress, 0)}</span>
                      </div>
                    </td>
                    <td className={cn("tabular py-3 pr-6 pl-3 text-right font-medium", p.margin < 0.1 ? "text-warning" : "text-ink")}>
                      {formatPercent(p.margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Actividad reciente" />
          <CardBody className="pt-3">
            <ol className="space-y-4">
              {demoActivity.map((a) => {
                const Icon = activityIcon[a.kind];
                return (
                  <li key={a.id} className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-ink-2">
                      <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[13px] text-ink">{a.text}</p>
                      <p className="text-[12px] text-muted">{a.when}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <Link href="/informes" className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700">
              Ver historial completo
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
