import type { Metadata } from "next";
import { FileText, LogOut, Wrench } from "lucide-react";
import { WorkerPage } from "@/components/layout/WorkerPage";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/layout/ProfileMenu";
import { ButtonLink } from "@/components/ui/Button";
import { demoWorkerUser } from "@/lib/demo/data";

export const metadata: Metadata = { title: "Perfil" };

export default function Page() {
  return (
    <WorkerPage title="Perfil">
      <Card className="flex items-center gap-4 p-5">
        <Avatar initials={demoWorkerUser.initials} size="lg" />
        <div>
          <p className="text-[17px] font-semibold text-ink">{demoWorkerUser.name}</p>
          <p className="text-[14px] text-muted">{demoWorkerUser.roleLabel}</p>
        </div>
      </Card>
      <Card className="divide-y divide-line">
        {[
          { icon: Wrench, label: "Herramientas y vehículo asignados", phase: 9 },
          { icon: FileText, label: "Mis documentos", phase: 6 },
        ].map((r) => (
          <div key={r.label} className="flex min-h-14 items-center gap-3 px-5 py-3">
            <r.icon className="h-5 w-5 text-subtle" aria-hidden="true" />
            <span className="flex-1 text-[15px] text-ink">{r.label}</span>
            <span className="text-[12px] text-muted">Fase {r.phase}</span>
          </div>
        ))}
      </Card>
      <ButtonLink href="/login" variant="secondary" size="lg" className="w-full" icon={<LogOut className="h-4 w-4" />}>
        Cerrar sesión
      </ButtonLink>
    </WorkerPage>
  );
}
