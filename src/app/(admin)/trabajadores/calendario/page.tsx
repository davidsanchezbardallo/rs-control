import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { ABSENCE_KIND } from "@/lib/labels";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Calendario de ausencias" };
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function Page(props: PageProps<"/trabajadores/calendario">) {
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const now = new Date();
  const [y, m] = (sp.mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`).split("-").map(Number) as [number, number];
  const days = new Date(y, m, 0).getDate();
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = `${y}-${String(m).padStart(2, "0")}-${days}`;
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const { supabase } = await requireAdmin();
  const [{ data: emps }, { data: abs }] = await Promise.all([
    supabase.from("employees").select("id, first_name, last_name").neq("status", "inactive").order("first_name"),
    supabase.from("absences").select("employee_id, kind, start_date, end_date").lte("start_date", last).gte("end_date", first).eq("status", "approved"),
  ]);
  const cell = (empId: string, d: number) => {
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return (abs ?? []).find((a) => a.employee_id === empId && a.start_date <= iso && a.end_date >= iso);
  };
  const weekend = (d: number) => [0, 6].includes(new Date(y, m - 1, d).getDay());
  return (
    <div className="space-y-6">
      <BackLink href="/trabajadores">Trabajadores</BackLink>
      <PageHeader
        title="Calendario de ausencias"
        description="Vacaciones y ausencias aprobadas del equipo."
        actions={
          <div className="flex items-center gap-2">
            <Link href={`?mes=${prev}`} aria-label="Mes anterior" className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] ring-1 ring-line hover:bg-surface"><ChevronLeft className="h-4 w-4" /></Link>
            <span className="min-w-36 text-center text-[15px] font-medium capitalize">{MONTHS[m - 1]} {y}</span>
            <Link href={`?mes=${next}`} aria-label="Mes siguiente" className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] ring-1 ring-line hover:bg-surface"><ChevronRight className="h-4 w-4" /></Link>
          </div>
        }
      />
      <Card className="overflow-x-auto p-4">
        <table className="w-full border-separate border-spacing-0.5 text-[12px]">
          <thead>
            <tr>
              <th className="sticky left-0 bg-canvas pr-3 text-left font-medium text-muted">Trabajador</th>
              {Array.from({ length: days }, (_, i) => (
                <th key={i} className={cn("w-7 min-w-7 text-center font-medium", weekend(i + 1) ? "text-subtle" : "text-muted")}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(emps ?? []).map((e) => (
              <tr key={e.id}>
                <td className="sticky left-0 bg-canvas py-1 pr-3 whitespace-nowrap"><Link className="text-ink hover:text-brand-600" href={`/trabajadores/${e.id}?tab=ausencias`}>{e.first_name} {e.last_name}</Link></td>
                {Array.from({ length: days }, (_, i) => {
                  const a = cell(e.id, i + 1);
                  return (
                    <td key={i} title={a ? ABSENCE_KIND[a.kind] : undefined} className={cn("h-7 rounded-[4px]", a ? (a.kind === "vacation" ? "bg-brand-500" : "bg-warning/70") : weekend(i + 1) ? "bg-surface-2" : "bg-surface")}>
                      <span className="sr-only">{a ? ABSENCE_KIND[a.kind] : ""}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex gap-5 text-[12px] text-ink-2">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-brand-500" />Vacaciones</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-warning/70" />Otras ausencias</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-surface-2" />Fin de semana</span>
        </div>
      </Card>
    </div>
  );
}
