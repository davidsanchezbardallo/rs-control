import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-4">
      <EmptyState
        icon={Compass}
        title="Página no encontrada"
        description="La dirección no existe o no tienes acceso a ella."
        action={<ButtonLink href="/">Volver al inicio</ButtonLink>}
      />
    </div>
  );
}
