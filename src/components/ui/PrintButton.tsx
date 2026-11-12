"use client";

import { Button } from "./Button";

/** Imprimir o guardar como PDF desde el navegador (estilos de impresión limpios). */
export function PrintButton({ icon, label = "Imprimir / PDF" }: { icon?: React.ReactNode; label?: string }) {
  return (
    <Button type="button" variant="ghost" icon={icon} onClick={() => window.print()}>
      {label}
    </Button>
  );
}
