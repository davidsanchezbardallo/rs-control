/** Variables públicas de Supabase (pueden estar en el navegador; RLS protege los datos). */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
/** Dominio técnico para convertir "usuario" en el email que exige Supabase Auth. */
export const USERNAME_EMAIL_DOMAIN = process.env.USERNAME_EMAIL_DOMAIN ?? "usuarios.rscontrol.invalid";

export function usernameToEmail(username: string) {
  const u = username.trim().toLowerCase();
  return u.includes("@") ? u : `${u}@${USERNAME_EMAIL_DOMAIN}`;
}
