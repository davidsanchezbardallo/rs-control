import { AdminShell } from "@/components/layout/AdminShell";
import { initials, requireAdmin } from "@/lib/auth/session";
import { getNotifications } from "@/features/system/queries";

/**
 * Zona de administración: exige sesión y rol "admin" EN EL SERVIDOR.
 * Un trabajador que escriba /tesoreria en la barra de direcciones es enviado a /mi,
 * y aunque llamase a la API directamente, RLS no le devolvería datos.
 */
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const { supabase, profile } = await requireAdmin();
  const notifications = await getNotifications(supabase);
  return (
    <AdminShell user={{ name: profile.fullName, roleLabel: "Administración", initials: initials(profile.fullName) }} notifications={notifications}>
      {children}
    </AdminShell>
  );
}
