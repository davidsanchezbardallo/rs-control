import { CheckCircle2, Construction } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ModuleInfo } from "@/lib/navigation/modules";

/** Pantalla provisional de un módulo aún no desarrollado. */
export function ModulePlaceholder({ module }: { module: ModuleInfo }) {
  return (
    <div className="space-y-6">
      <PageHeader title={module.title} description={module.description} eyebrow={<Badge tone="brand">Fase {module.phase}</Badge>} />
      <Card>
        <CardHeader title="Módulo en preparación" description="Funciones previstas para este módulo" action={<Construction className="h-5 w-5 text-subtle" aria-hidden="true" />} />
        <CardBody>
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {module.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[14px] text-ink-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
