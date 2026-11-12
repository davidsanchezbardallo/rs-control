import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { WorkerPlaceholder } from "@/components/layout/WorkerPlaceholder";

export const metadata: Metadata = { title: "Vacaciones" };

export default function Page() {
  return (
    <WorkerPage title="Vacaciones" subtitle="Días disponibles y solicitudes">
      <WorkerPlaceholder icon={CalendarDays} title="Solicita tus vacaciones desde aquí" description="Consulta tus días disponibles, envía solicitudes y revisa su estado." phase={6} />
    </WorkerPage>
  );
}
