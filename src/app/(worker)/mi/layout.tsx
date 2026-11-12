import { redirect } from "next/navigation";
import { WorkerShell } from "@/components/layout/WorkerShell";
import { requireUser } from "@/lib/auth/session";
import { getNotifications } from "@/features/system/queries";

/** App del trabajador (móvil). Requiere un usuario vinculado a una ficha de trabajador. */
export default async function WorkerLayout({ children }: LayoutProps<"/mi">) {
  const { supabase, profile } = await requireUser();
  if (!profile.employeeId) redirect(profile.role === "admin" ? "/panel" : "/login");
  const notifications = await getNotifications(supabase);
  return <WorkerShell notifications={notifications}>{children}</WorkerShell>;
}
