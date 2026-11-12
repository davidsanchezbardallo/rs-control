import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Acceso" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Panel de marca (solo en pantallas grandes) */}
      <aside className="relative hidden w-[44%] max-w-[640px] overflow-hidden bg-brand-950 lg:block">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-white text-[17px] font-bold text-brand-700">RS</span>
            <span className="text-[15px] font-semibold tracking-tight">RS CONTROL</span>
          </div>
          <div>
            <span className="mb-6 block h-1 w-12 rounded-full bg-accent-500" aria-hidden="true" />
            <h2 className="max-w-md text-[34px] leading-[1.15] font-semibold tracking-tight">
              Toda la empresa,
              <br />
              en un solo lugar.
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/65">
              Almacén, obras, personal, tesorería y documentación de RS Instalaciones XXI, conectados.
            </p>
          </div>
          <p className="text-[12px] text-white/45">RS Instalaciones XXI SL · Utrera, Sevilla</p>
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">Iniciar sesión</h1>
          <p className="mt-1.5 text-[15px] text-muted">Accede con tu usuario de RS Control.</p>
          <LoginForm />
          <p className="mt-10 text-[12px] leading-relaxed text-muted">
            Acceso restringido al personal autorizado de RS Instalaciones XXI SL. La actividad queda registrada.
          </p>
        </div>
      </main>
    </div>
  );
}
