import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import type { NotificationItem } from "./notifications";

export async function getNotifications(supabase: Supabase): Promise<NotificationItem[]> {
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}
