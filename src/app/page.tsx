import { redirect } from "next/navigation";

// Fase 1: sin autenticación todavía, la raíz lleva al acceso.
// Fase 3: redirigirá según el rol (admin -> /panel, trabajador -> /mi).
export default function Home() {
  redirect("/login");
}
