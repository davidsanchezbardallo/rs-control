import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { SettingsTabs } from "@/features/settings/SettingsTabs";
import { PasswordForm } from "@/features/settings/forms";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function Page() {
  const { profile } = await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" />
      <SettingsTabs active="/configuracion/perfil" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><CardHeader title="Mi cuenta" /><CardBody><DescriptionList items={[{ label: "Nombre", value: profile.fullName }, { label: "Usuario", value: profile.username }, { label: "Rol", value: "Administración" }]} /></CardBody></Card>
        <Card><CardHeader title="Cambiar contraseña" /><CardBody><PasswordForm /></CardBody></Card>
      </div>
    </div>
  );
}
