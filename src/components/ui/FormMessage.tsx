import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionState } from "@/lib/actions";

/** Mensaje de resultado de una acción (error o confirmación), accesible. */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  const ok = state.ok;
  return (
    <p
      role={ok ? "status" : "alert"}
      className={
        "flex items-start gap-2 rounded-[var(--radius-md)] px-3.5 py-2.5 text-[14px] " +
        (ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")
      }
    >
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      {state.message}
    </p>
  );
}
