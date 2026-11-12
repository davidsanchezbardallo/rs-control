import { WorkerShell } from "@/components/layout/WorkerShell";
import { demoNotifications } from "@/lib/demo/data";

/**
 * App del trabajador (móvil).
 * Fase 3: comprobación de sesión en servidor y notificaciones reales,
 * filtradas por RLS para que cada trabajador vea solo lo suyo.
 */
export default function WorkerLayout({ children }: LayoutProps<"/mi">) {
  return <WorkerShell notifications={demoNotifications.slice(0, 2)}>{children}</WorkerShell>;
}
