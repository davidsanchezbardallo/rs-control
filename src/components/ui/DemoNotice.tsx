import { FlaskConical } from "lucide-react";

/**
 * Aviso obligatorio en pantallas con datos de ejemplo (Fases 1-2).
 * Evita que cifras ficticias se confundan con información real de RS.
 */
export function DemoNotice({ children = "Datos de ejemplo ficticios. Se sustituirán por datos reales cuando se conecte la base de datos." }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-info-soft px-3.5 py-2.5 text-[13px] text-brand-800">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
