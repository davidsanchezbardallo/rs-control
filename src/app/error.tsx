"use client";

import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

// Error inesperado: mensaje claro, sin mostrar detalles técnicos al usuario.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4">
      <EmptyState
        icon={AlertTriangle}
        title="Algo no ha ido bien"
        description="No se ha podido completar la operación. Inténtalo de nuevo; si el problema continúa, avisa a administración."
        action={<Button onClick={reset}>Reintentar</Button>}
      />
    </div>
  );
}
