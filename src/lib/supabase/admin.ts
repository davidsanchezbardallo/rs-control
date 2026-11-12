import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SUPABASE_URL } from "./env";

/**
 * Cliente con la CLAVE SECRETA: ignora RLS.
 * Uso EXCLUSIVO para gestionar cuentas de acceso (crear usuarios, cambiar
 * contraseñas) desde acciones que ya han comprobado que quien llama es admin.
 * "server-only" impide que este archivo llegue jamás al navegador.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY en el servidor");
  return createClient<Database>(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
