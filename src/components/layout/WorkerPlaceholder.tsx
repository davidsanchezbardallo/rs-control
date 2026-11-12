import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export function WorkerPlaceholder({ icon, title, description, phase }: { icon: LucideIcon; title: string; description: string; phase: number }) {
  return (
    <Card>
      <EmptyState icon={icon} title={title} description={description} action={<Badge tone="brand">Se desarrolla en la Fase {phase}</Badge>} />
    </Card>
  );
}
