import type { Tone } from "@/components/ui/Badge";

/** Color de etiqueta para cada estado de solicitud de material. */
export const REQUEST_STATUS_TONE: Record<string, Tone> = {
  Pendiente: "neutral",
  "En revisión": "brand",
  Aprobada: "brand",
  Preparada: "warning",
  Entregada: "success",
  Rechazada: "danger",
  Cancelada: "neutral",
};

export const PROJECT_STATUS_TONE: Record<string, Tone> = {
  Presupuestada: "neutral",
  "Pendiente de aprobación": "neutral",
  Aprobada: "brand",
  "En preparación": "brand",
  "En ejecución": "success",
  Paralizada: "warning",
  Finalizada: "neutral",
  Cerrada: "neutral",
};
