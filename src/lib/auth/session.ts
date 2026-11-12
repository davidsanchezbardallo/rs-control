import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/permissions/roles";

export type SessionProfile = {
  id: string;
  role: Role;
  username: string;
  fullName: string;
  employeeId: string | null;
  companyId: string;
};

/**
 * Capa de acceso a datos (DAL): única forma de obtener el usuario actual.
 * Verifica la sesión contra Supabase Auth (no se fía solo de la cookie) y
 * carga el perfil. `cache` evita repetir la consulta en una misma petición.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("id, role, username, full_name, employee_id, company_id, is_active")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!p || !p.is_active) return null;
  const profile: SessionProfile = {
    id: p.id,
    role: p.role,
    username: p.username,
    fullName: p.full_name,
    employeeId: p.employee_id,
    companyId: p.company_id,
  };
  return { supabase, profile };
});

/** Exige sesión activa (cualquier rol). */
export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

/** Exige rol de administración; un trabajador es enviado a su app. */
export async function requireAdmin() {
  const s = await requireUser();
  if (s.profile.role !== "admin") redirect("/mi");
  return s;
}

/** Para acciones de servidor: devuelve null en lugar de redirigir. */
export async function getAdminOrNull() {
  const s = await getSession();
  return s && s.profile.role === "admin" ? s : null;
}

export function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
