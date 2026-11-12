import type { Metadata } from "next";
import { HardHat } from "lucide-react";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { WorkerPlaceholder } from "@/components/layout/WorkerPlaceholder";

export const metadata: Metadata = { title: "Mis obras" };

export default function Page() {
  return (
    <WorkerPage title="Mis obras" subtitle="Obras en las que estás asignado">
      <WorkerPlaceholder icon={HardHat} title="Tus obras aparecerán aquí" description="Dirección, documentación necesaria e incidencias de cada obra asignada." phase={5} />
    </WorkerPage>
  );
}
