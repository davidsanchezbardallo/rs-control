"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { login } from "./actions";
import { idle } from "@/lib/actions";

export function LoginForm() {
  const [show, setShow] = useState(false);
  const [state, action] = useActionState(login, idle);

  return (
    <form action={action} className="mt-8 space-y-5">
      <Input
        label="Usuario"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="nombre.apellido"
        required
        leading={<UserRound className="h-4 w-4" />}
      />
      <div className="relative">
        <Input
          label="Contraseña"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          required
          leading={<Lock className="h-4 w-4" />}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-1.5 bottom-1.5 grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] text-muted hover:text-ink"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {state.message && (
        <p role="alert" className="flex items-center gap-2 rounded-[var(--radius-md)] bg-danger-soft px-3.5 py-2.5 text-[14px] text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {state.message}
        </p>
      )}

      <SubmitButton size="lg" className="w-full" pendingText="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  );
}
