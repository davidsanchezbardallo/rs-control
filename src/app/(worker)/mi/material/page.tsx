import type { Metadata } from "next";
import { PackagePlus } from "lucide-react";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { WorkerPlaceholder } from "@/components/layout/WorkerPlaceholder";

export const metadata: Metadata = { title: "Material" };

export default function Page() {
  return (
    <WorkerPage title="Material" subtitle="Solicitudes, recepciones, consumos y devoluciones">
      <WorkerPlaceholder icon={PackagePlus} title="Solicitar material" description="Selecciona la obra, busca los materiales e indica cantidades. Podrás confirmar la recepción y registrar consumos y devoluciones." phase={4} />
    </WorkerPage>
  );
}
