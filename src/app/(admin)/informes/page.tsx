import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Boxes, HardHat, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ReportTabs } from "@/features/reports/components";

export const metadata: Metadata = { title: "Informes" };

const REPORTS = [
  { href: "/informes/almacen", icon: Boxes, title: "Almacén", items: ["Valoración del inventario", "Consumo por obra y por trabajador", "Materiales más utilizados", "Stock mínimo y materiales sin movimiento", "Entradas por proveedor"] },
  { href: "/informes/obras", icon: HardHat, title: "Obras", items: ["Rentabilidad por obra", "Costes por partida", "Ingresos por cliente", "Obras activas y finalizadas", "Desviaciones presupuestarias"] },
  { href: "/informes/finanzas", icon: BarChart3, title: "Finanzas", items: ["Ingresos y gastos mensuales", "Margen", "Gastos por categoría", "Cobros y pagos pendientes", "Deuda financiera y compromisos"] },
  { href: "/informes/personal", icon: Users, title: "Personal", items: ["Trabajadores asignados", "Vacaciones disfrutadas", "Documentación caducada o por caducar", "Formación y acreditaciones"] },
];

export default async function Page() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Informes y estadísticas" description="Análisis de la empresa con selección de periodo, exportación a Excel e impresión o PDF." />
      <ReportTabs active="/informes" />
      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="h-full p-6 transition-shadow hover:shadow-raised">
              <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600"><r.icon className="h-5 w-5" /></span>
              <h2 className="mt-4 text-[17px] font-semibold text-ink">{r.title}</h2>
              <ul className="mt-2 space-y-1 text-[14px] text-muted">{r.items.map((i) => <li key={i}>· {i}</li>)}</ul>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
