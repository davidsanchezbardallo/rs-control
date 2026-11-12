import "server-only";
import type { Supabase } from "@/lib/supabase/server";

export type MyContext = {
  employee: { id: string; code: string; first_name: string; last_name: string; job_title: string | null; phone: string | null; email: string | null } | null;
  projects: { id: string; code: string; name: string; address: string | null; city: string | null; since: string }[];
  vehicle: { id: string; plate: string; brand: string | null; model: string | null; since: string } | null;
  tools: { id: string; code: string; name: string; since: string }[];
};

export async function getMyContext(supabase: Supabase): Promise<MyContext> {
  const { data } = await supabase.rpc("my_context");
  return (data as unknown as MyContext) ?? { employee: null, projects: [], vehicle: null, tools: [] };
}

/** Entregas pendientes de confirmar por el trabajador. */
export async function getPendingReceptions(supabase: Supabase, employeeId: string, profileId: string) {
  const { data } = await supabase
    .from("inventory_documents")
    .select("id, number, occurred_at, project:projects(code, name), request:material_requests(number)")
    .eq("employee_id", employeeId)
    .eq("kind", "issue")
    .is("received_confirmed_at", null)
    .is("reversed_by_document_id", null)
    .neq("created_by", profileId) // las salidas que registra él mismo no requieren confirmación
    .order("occurred_at", { ascending: false });
  return data ?? [];
}
