import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { RequestStatusActions } from "@/features/inventory/components/RequestActions";
import { DeliverForm } from "@/features/inventory/components/DeliverForm";
import { PRIORITY, REQUEST_STATUS } from "@/lib/labels";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Solicitud de material" };

export default async function Page(props: PageProps<"/almacen/solicitudes/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireAdmin();
  const { data: r } = await supabase
    .from("material_requests")
    .select("*, project:projects(id, code, name, address, city), employee:employees(id, first_name, last_name, phone), items:material_request_items(id, material_id, free_text, quantity, approved_quantity, delivered_quantity, material:materials(id, code, name, unit:units(code, allows_decimals)))")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();
  const matIds = r.items.map((i) => i.material_id).filter(Boolean) as string[];
  const [{ data: stock }, { data: docs }] = await Promise.all([
    supabase.from("v_stock").select("id, quantity").in("id", matIds.length ? matIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("inventory_documents").select("id, number, occurred_at, received_confirmed_at").eq("request_id", id).order("occurred_at"),
  ]);
  const avail = new Map((stock ?? []).map((s) => [s.id, Number(s.quantity)]));
  const open = ["pending", "in_review", "approved", "prepared"].includes(r.status);
  const prefill = r.items
    .filter((i) => i.material)
    .map((i) => {
      const want = Number(i.approved_quantity ?? i.quantity) - Number(i.delivered_quantity);
      const max = avail.get(i.material_id!) ?? 0;
      return { material_id: i.material!.id, name: i.material!.name, code: i.material!.code, unit: i.material!.unit?.code ?? "", decimals: !!i.material!.unit?.allows_decimals, max, quantity: Math.max(0, Math.min(want, max)) };
    })
    .filter((l) => l.quantity > 0);
  const st = REQUEST_STATUS[r.status];

  return (
    <div className="space-y-6">
      <BackLink href="/almacen/solicitudes">Solicitudes</BackLink>
      <PageHeader
        eyebrow={<span className="flex gap-2"><Badge tone={st.tone}>{st.label}</Badge><Badge tone={PRIORITY[r.priority].tone}>Prioridad {PRIORITY[r.priority].label.toLowerCase()}</Badge></span>}
        title={`Solicitud ${r.number}`}
        description={`Recibida ${formatDateTime(r.created_at)}`}
        actions={open ? <RequestStatusActions requestId={r.id} status={r.status} /> : undefined}
      />
      <Card className="p-5 sm:p-6">
        <DescriptionList
          columns={3}
          items={[
            { label: "Obra", value: r.project && <Link className="text-brand-600" href={`/obras/${r.project.id}`}>{r.project.code} · {r.project.name}</Link> },
            { label: "Trabajador", value: r.employee && <Link className="text-brand-600" href={`/trabajadores/${r.employee.id}`}>{r.employee.first_name} {r.employee.last_name}</Link> },
            { label: "Necesario para", value: r.needed_by ? formatDate(r.needed_by) : null },
            { label: "Dirección de la obra", value: [r.project?.address, r.project?.city].filter(Boolean).join(", ") || null },
            { label: "Revisada", value: r.reviewed_at ? formatDateTime(r.reviewed_at) : null },
            { label: "Motivo", value: r.status_reason },
          ]}
        />
        {r.notes && <p className="mt-5 rounded-[var(--radius-md)] bg-surface px-4 py-3 text-[14px] text-ink-2">«{r.notes}»</p>}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Material solicitado" description="Disponibilidad real en la nave en este momento." />
        <Table className="mt-4" minWidth={700}>
          <THead>
            <Th>Material</Th>
            <Th align="right">Solicitado</Th>
            <Th align="right">Disponible</Th>
            <Th align="right">Entregado</Th>
          </THead>
          <TBody>
            {r.items.map((i) => {
              const a = i.material_id ? (avail.get(i.material_id) ?? 0) : null;
              const short = a !== null && a < Number(i.quantity) - Number(i.delivered_quantity);
              return (
                <Tr key={i.id}>
                  <Td>
                    {i.material ? (
                      <Link className="font-medium text-ink hover:text-brand-600" href={`/almacen/materiales/${i.material.id}`}>{i.material.name}</Link>
                    ) : (
                      <span className="font-medium text-ink">{i.free_text} <Badge tone="warning">No catalogado</Badge></span>
                    )}
                    {i.material && <p className="text-[12px] text-muted">{i.material.code}</p>}
                  </Td>
                  <Td align="right">{formatNumber(Number(i.quantity))} {i.material?.unit?.code}</Td>
                  <Td align="right" className={short ? "font-medium text-danger" : "text-ink-2"}>{a === null ? "—" : formatNumber(a)}</Td>
                  <Td align="right" className="text-ink-2">{formatNumber(Number(i.delivered_quantity))}</Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </Card>

      {open && (
        <Card>
          <CardHeader title="Entregar material" description="Ajusta las cantidades si es necesario. Al confirmar se descuenta el stock y se notifica al trabajador para que confirme la recepción." />
          <CardBody>
            {prefill.length > 0 || r.items.some((i) => i.material) ? (
              <DeliverForm requestId={r.id} projectId={r.project!.id} employeeId={r.employee!.id} lines={prefill} />
            ) : (
              <p className="text-[14px] text-muted">La solicitud solo contiene material no catalogado: dalo de alta en el catálogo o regístralo como entrada antes de entregarlo.</p>
            )}
          </CardBody>
        </Card>
      )}

      {docs && docs.length > 0 && (
        <Card>
          <CardHeader title="Entregas realizadas" />
          <CardBody>
            <ul className="divide-y divide-line">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2.5 text-[14px]">
                  <Link className="font-medium text-brand-600" href={`/almacen/movimientos/${d.id}`}>{d.number}</Link>
                  <span className="text-muted">{formatDateTime(d.occurred_at)}</span>
                  {d.received_confirmed_at ? <Badge tone="success">Recibido</Badge> : <Badge tone="warning">Pendiente de confirmar</Badge>}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
