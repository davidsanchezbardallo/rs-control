"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";

export type NotificationItem = { id: string; title: string; body: string | null; link: string | null; created_at: string; read_at: string | null };

export async function markNotificationRead(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const { supabase, profile } = await requireUser();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", profile.id).is("read_at", null);
  revalidatePath("/", "layout");
}
