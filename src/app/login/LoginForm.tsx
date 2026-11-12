"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Fase 1: formulario visual. El inicio de sesión real (Supabase Auth,
 * validación en servidor y límite de intentos) se conecta en la Fase 3.
 */
export function LoginForm() {
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState(false);

  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setNotice(true);
      }}
      noValidate
    >
      <Input
        label="Usuario"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="nombre.apellido"
        leading={<UserRound className="h-4 w-4" />}
      />
      <div className="relative">
        <Input
          label="Contraseña"
          name="password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
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

      <Button type="submit" size="lg" className="w-full">
        Entrar
      </Button>

      {notice && (
        <div role="status" className="animate-fade-in rounded-[var(--radius-md)] bg-surface p-4 text-[13px] text-ink-2">
          <p className="font-medium text-ink">Vista previa de diseño (Fase 1)</p>
          <p className="mt-1">El acceso real se activará al conectar Supabase. Mientras tanto puedes ver:</p>
          <div className="mt-3 flex gap-2">
            <ButtonLink href="/panel" size="sm">Administración</ButtonLink>
            <ButtonLink href="/mi" size="sm" variant="secondary">Trabajador</ButtonLink>
          </div>
        </div>
      )}
    </form>
  );
}
