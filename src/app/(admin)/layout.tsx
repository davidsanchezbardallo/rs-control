import { AdminShell } from "@/components/layout/AdminShell";
import { demoAdminUser, demoNotifications } from "@/lib/demo/data";

/**
 * Zona de administración.
 * Fase 3: aquí se comprobará la sesión y el rol en servidor (requireRole("admin"))
 * y los datos de usuario/notificaciones vendrán de Supabase.
 */
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <AdminShell role="admin" user={demoAdminUser} notifications={demoNotifications}>
      {children}
    </AdminShell>
  );
}
