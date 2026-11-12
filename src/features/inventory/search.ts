"use server";

import { requireUser } from "@/lib/auth/session";

export type MaterialOption = {
  id: string;
  code: string;
  name: string;
  brand: string | null;
  unit_code: string;
  allows_decimals: boolean;
  available: number;
  category_name: string | null;
};

/** Búsqueda de materiales con disponibilidad (sin costes). Disponible para cualquier usuario activo. */
export async function searchMaterials(query: string): Promise<MaterialOption[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("materials_search", { p_query: query.slice(0, 80), p_limit: 20 });
  return (data ?? []).map((m) => ({ ...m, available: Number(m.available) }));
}

/** Material retirado (neto) para una obra: el trabajador ve lo suyo; administración, todo. */
export async function projectMaterials(projectId: string) {
  const { supabase } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return [];
  const { data } = await supabase.rpc("my_project_materials", { p_project: projectId });
  return (data ?? []).map((m) => ({
    material_id: m.material_id,
    code: m.code,
    name: m.name,
    unit_code: m.unit_code,
    allows_decimals: m.allows_decimals,
    max: Number(m.net_quantity),
  }));
}
