"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { FormMessage } from "./FormMessage";
import { idle, type ActionState } from "@/lib/actions";

/**
 * Formulario conectado a una acción de servidor. Muestra el resultado y,
 * si se indica, se vacía tras guardar correctamente.
 * `children` puede ser una función que recibe el estado (para errores por campo).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  onSuccess,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode | ((state: ActionState) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, idle);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.();
    }
  }, [state, resetOnSuccess, onSuccess]);
  return (
    <form ref={ref} action={formAction} className={className ?? "space-y-4"}>
      {typeof children === "function" ? children(state) : children}
      <FormMessage state={state} />
    </form>
  );
}
