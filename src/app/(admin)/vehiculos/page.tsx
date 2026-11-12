import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { FleetTabs } from "@/features/fleet/components/FleetTabs";
import { OWNERSHIP, VEHICLE_STATUS } from "@/lib/labels";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { todayISO } from "@/features/lookups";
import { dueTone } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Vehículos" };

function DueBadge({ d }: { d: string | null; today?: string }) {
  if (!d) return <span className="text-muted">—</span>;
  return <Badge tone={dueTone(d)}>{formatDate(d)}</Badge>;
}

export default async function Page() {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: assign }] = await Promise.all([
    supabase.from("vehicles").select("*").order("status").order("plate"),
    supabase.from("vehicle_assignments").select("vehicle_id, employee:employees(first_name, last_name)").is("end_date", null),
  ]);
  const who = new Map((assign ?? []).map((a) => [a.vehicle_id, a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : ""]));
  const today = todayISO();
  return (
    <div className="space-y-6">
      <PageHeader title="Vehículos y herramientas" description="Flota, ITV, seguros, mantenimientos y quién lleva cada vehículo." actions={<ButtonLink href="/vehiculos/nuevo" icon={<Plus className="h-4 w-4" />}>Nuevo vehículo</ButtonLink>} />
      <FleetTabs active="/vehiculos" />
      <Card className="overflow-hidden">
        <Table minWidth={900}>
          <THead><Th>Vehículo</Th><Th>Asignado a</Th><Th align="right">Km</Th><Th>ITV</Th><Th>Seguro</Th><Th>Revisión</Th><Th>Estado</Th></THead>
          <TBody>
            {(data ?? []).map((veh) => (
              <Tr key={veh.id}>
                <Td><Link href={`/vehiculos/${veh.id}`} className="font-mono font-medium text-ink hover:text-brand-600">{veh.plate}</Link><p className="text-[12px] text-muted">{[veh.brand, veh.model].filter(Boolean).join(" ")} · {OWNERSHIP[veh.ownership]}</p></Td>
                <Td className="text-ink-2">{who.get(veh.id) || "—"}</Td>
                <Td align="right" className="text-ink-2">{veh.odometer_km ? formatNumber(veh.odometer_km) : "—"}</Td>
                <Td><DueBadge d={veh.itv_due} today={today} /></Td>
                <Td><DueBadge d={veh.insurance_due} today={today} /></Td>
                <Td><DueBadge d={veh.next_service_due} today={today} /></Td>
                <Td><Badge tone={VEHICLE_STATUS[veh.status].tone}>{VEHICLE_STATUS[veh.status].label}</Badge></Td>
              </Tr>
            ))}
            {!data?.length && <EmptyRow cols={7}>Sin vehículos registrados.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
