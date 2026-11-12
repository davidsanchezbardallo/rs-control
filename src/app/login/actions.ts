"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/supabase/env";
import type { ActionState } from "@/lib/actions";

const schema = z.object({
  username: z.string().trim().min(3, "Escribe tu usuario").max(120),
  password: z.string().min(1, "Escribe tu contraseña").max(200),
});

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({ username: fd.get("username"), password: fd.get("password") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(parsed.data.username),
    password: parsed.data.password,
  });
  // Mensaje genérico: no revela si el usuario existe
  if (error || !data.user) return { ok: false, message: "Usuario o contraseña incorrectos." };

  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { ok: false, message: "Tu acceso está desactivado. Contacta con administración." };
  }
  redirect(profile.role === "admin" ? "/panel" : "/mi");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
