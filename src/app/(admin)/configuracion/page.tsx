import type { Metadata } from "next";
import { DatabaseBackup, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SettingsTabs } from "@/features/settings/SettingsTabs";
import { CompanyForm } from "@/features/settings/forms";

export const metadata: Metadata = { title: "Configuración" };

export default async function Page() {
  const { supabase } = await requireAdmin();
  const { data: c } = await supabase.from("companies").select("*").single();
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Datos de empresa, usuarios, catálogos y seguridad." />
      <SettingsTabs active="/configuracion" />
      <Card><CardHeader title="Datos de la empresa" /><CardBody><CompanyForm c={{ ...c!, settings: undefined }} settings={(c?.settings ?? {}) as { vacation_days_per_year?: number; alert_days?: number }} /></CardBody></Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Copias de seguridad" action={<DatabaseBackup className="h-5 w-5 text-subtle" />} />
          <CardBody className="space-y-2 text-[14px] text-ink-2">
            <p>· Base de datos: copia diaria automática del proveedor (Supabase Pro, 7 días) y copia semanal propia fuera de Supabase.</p>
            <p>· Archivos (PDF, fotos): sincronización periódica a almacenamiento externo de RS (no se incluyen en las copias de la base de datos).</p>
            <p>· Prueba de restauración cada 6 meses. Procedimiento en <span className="font-mono text-[13px]">docs/06-operaciones.md</span>.</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Seguridad y protección de datos" action={<ShieldCheck className="h-5 w-5 text-subtle" />} />
          <CardBody className="space-y-2 text-[14px] text-ink-2">
            <p>· Permisos aplicados en la base de datos (RLS): un trabajador nunca accede a tesorería, facturas, costes ni datos de otros.</p>
            <p>· Documentos en almacenamiento privado con enlaces de descarga de 60 segundos.</p>
            <p>· Auditoría de operaciones críticas (pestaña Auditoría).</p>
            <p>· RS Control es una herramienta de gestión interna: no sustituye a la contabilidad oficial ni a la gestoría.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
