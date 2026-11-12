import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

/** Raíz: lleva a cada usuario a su zona según su rol. */
export default async function Home() {
  const s = await getSession();
  if (!s) redirect("/login");
  redirect(s.profile.role === "admin" ? "/panel" : "/mi");
}
