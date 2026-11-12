import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { SettingsTabs } from "@/features/settings/SettingsTabs";
import { CreateAccountDialog, ResetPasswordDialog, ToggleAccountButton } from "@/features/employees/components/forms";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Usuarios y permisos" };

const MATRIX: [string, boolean, string][] = [
  ["Panel de empresa, informes y configuración", true, "No"],
  ["Almacén: stock con costes, entradas, ajustes, aprobar solicitudes", true, "No"],
  ["Solicitar material y confirmar recepciones", true, "Sí, las suyas"],
  ["Registrar salidas y devoluciones de material", true, "Sí, a su nombre"],
  ["Ver catálogo y disponibilidad (sin costes)", true, "Sí"],
  ["Indicar obra en la que trabaja y vehículo que lleva", true, "Sí, los suyos"],
  ["Comunicar incidencias con fotos", true, "Sí, ve las suyas"],
  ["Obras: fichas, economía, documentación", true, "No"],
  ["Trabajadores, DNI, documentos, vacaciones", true, "No (solo su ficha básica)"],
  ["Tesorería, facturas, clientes y proveedores", true, "No"],
  ["Vehículos y herramientas", true, "Solo los suyos"],
];

export default async function Page() {
  const { supabase, profile } = await requireAdmin();
  const { data: users } = await supabase.from("profiles").select("id, username, full_name, role, is_active, employee_id, created_at").order("role").order("full_name");
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Cuentas de acceso y permisos por rol." actions={<CreateAccountDialog role="admin" />} />
      <SettingsTabs active="/configuracion/usuarios" />
      <Card className="overflow-hidden">
        <CardHeader title="Usuarios" description="Las cuentas de trabajadores se crean desde su ficha (Trabajadores → ficha → Acceso a RS Control)." />
        <Table className="mt-3" minWidth={760}>
          <THead><Th>Usuario</Th><Th>Rol</Th><Th>Alta</Th><Th>Estado</Th><Th align="right">Acciones</Th></THead>
          <TBody>
            {(users ?? []).map((u) => (
              <Tr key={u.id}>
                <Td><span className="font-medium">{u.full_name}</span><p className="font-mono text-[12px] text-muted">{u.username}</p></Td>
                <Td><Badge tone={u.role === "admin" ? "brand" : "neutral"}>{ROLE_LABELS[u.role]}</Badge>{u.employee_id && <Link className="ml-2 text-[12px] text-brand-600" href={`/trabajadores/${u.employee_id}`}>ficha</Link>}</Td>
                <Td className="text-ink-2">{formatDate(u.created_at)}</Td>
                <Td>{u.is_active ? <Badge tone="success">Activo</Badge> : <Badge>Desactivado</Badge>}</Td>
                <Td align="right"><span className="flex justify-end gap-1"><ResetPasswordDialog profileId={u.id} />{u.id !== profile.id && <ToggleAccountButton profileId={u.id} active={u.is_active} />}</span></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Permisos por rol" description="Se aplican en la interfaz, en el servidor y en la base de datos." />
        <CardBody className="pt-3">
          <Table minWidth={560}>
            <THead><Th>Función</Th><Th>Administración</Th><Th>Trabajador</Th></THead>
            <TBody>
              {MATRIX.map(([f, a, w]) => (
                <Tr key={f}><Td>{f}</Td><Td>{a ? <Badge tone="success">Sí</Badge> : "No"}</Td><Td>{w.startsWith("No") ? <Badge tone="neutral">{w}</Badge> : <Badge tone="brand">{w}</Badge>}</Td></Tr>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
