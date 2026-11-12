import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { EmptyRow, Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { DocumentsCard } from "@/features/documents/components/DocumentsCard";
import { AssignVehicleForm, EditVehicleDialog, VehicleEventDialog } from "@/features/fleet/components/forms";
import { employeeOptions, supplierOptions, todayISO } from "@/features/lookups";
import { OWNERSHIP, VEHICLE_EVENT, VEHICLE_STATUS } from "@/lib/labels";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Vehículo" };

export default async function Page(props: PageProps<"/vehiculos/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireAdmin();
  const { data: veh } = await supabase.from("vehicles").select("*").eq("id", id).maybeSingle();
  if (!veh) notFound();
  const [{ data: events }, { data: assigns }, { data: renting }, employees, suppliers] = await Promise.all([
    supabase.from("vehicle_events").select("*, supplier:suppliers(name)").eq("vehicle_id", id).order("event_date", { ascending: false }),
    supabase.from("vehicle_assignments").select("id, start_date, end_date, employee:employees(id, first_name, last_name)").eq("vehicle_id", id).order("start_date", { ascending: false }),
    supabase.from("recurring_commitments").select("name, amount, frequency, end_date").eq("vehicle_id", id).eq("is_active", true),
    employeeOptions(supabase),
    supplierOptions(supabase),
  ]);
  const current = assigns?.find((a) => !a.end_date);
  const totalCost = (events ?? []).reduce((s, e) => s + Number(e.cost ?? 0), 0);
  return (
    <div className="space-y-6">
      <BackLink href="/vehiculos">Vehículos</BackLink>
      <PageHeader eyebrow={<Badge tone={VEHICLE_STATUS[veh.status].tone}>{VEHICLE_STATUS[veh.status].label}</Badge>} title={veh.plate} description={[veh.brand, veh.model, OWNERSHIP[veh.ownership]].filter(Boolean).join(" · ")} actions={<EditVehicleDialog veh={veh} />} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Datos" />
          <CardBody>
            <DescriptionList
              columns={3}
              items={[
                { label: "Kilometraje", value: veh.odometer_km ? `${formatNumber(veh.odometer_km)} km` : null },
                { label: "Adquisición", value: veh.acquired_on ? formatDate(veh.acquired_on) : null },
                { label: "Próxima ITV", value: veh.itv_due ? formatDate(veh.itv_due) : null },
                { label: "Aseguradora", value: veh.insurance_company },
                { label: "Póliza", value: veh.insurance_policy },
                { label: "Vence el seguro", value: veh.insurance_due ? formatDate(veh.insurance_due) : null },
                { label: "Próxima revisión", value: veh.next_service_due ? formatDate(veh.next_service_due) : null },
                { label: "Gasto registrado", value: formatCurrency(totalCost) },
                { label: "Renting / cuota", value: renting?.length ? renting.map((r) => `${r.name}: ${formatCurrency(Number(r.amount))}`).join(", ") : null },
              ]}
            />
            {veh.notes && <p className="mt-5 rounded-[var(--radius-md)] bg-surface px-4 py-3 text-[14px] text-ink-2">{veh.notes}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Asignación" description="Los trabajadores también pueden indicarlo desde el móvil." />
          <CardBody className="space-y-4">
            <AssignVehicleForm vehicleId={id} employees={employees} current={current?.employee?.id} />
            <ul className="divide-y divide-line text-[14px]">
              {(assigns ?? []).slice(0, 6).map((a) => (
                <li key={a.id} className="flex justify-between py-2"><Link className="text-ink hover:text-brand-600" href={`/trabajadores/${a.employee?.id}`}>{a.employee?.first_name} {a.employee?.last_name}</Link><span className="text-muted">{formatDate(a.start_date)}{a.end_date ? ` → ${formatDate(a.end_date)}` : " · actual"}</span></li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <CardHeader title="Mantenimientos, averías y revisiones" action={<VehicleEventDialog vehicleId={id} suppliers={suppliers} today={todayISO()} />} />
        <Table className="mt-3">
          <THead><Th>Fecha</Th><Th>Tipo</Th><Th>Descripción</Th><Th align="right">Km</Th><Th align="right">Coste</Th></THead>
          <TBody>
            {(events ?? []).map((e) => (
              <Tr key={e.id}><Td>{formatDate(e.event_date)}</Td><Td><Badge tone={e.kind === "breakdown" ? "warning" : "neutral"}>{VEHICLE_EVENT[e.kind]}</Badge></Td><Td>{e.description}{e.supplier && <span className="text-muted"> · {e.supplier.name}</span>}</Td><Td align="right" className="text-ink-2">{e.odometer_km ? formatNumber(e.odometer_km) : "—"}</Td><Td align="right">{e.cost ? formatCurrency(Number(e.cost)) : "—"}</Td></Tr>
            ))}
            {!events?.length && <EmptyRow cols={5}>Sin registros.</EmptyRow>}
          </TBody>
        </Table>
      </Card>
      <DocumentsCard supabase={supabase} entity="vehicle" entityId={id} title="Documentación del vehículo" defaultCategory="vehicle" categories={["vehicle", "insurance", "contract", "other"]} />
    </div>
  );
}
