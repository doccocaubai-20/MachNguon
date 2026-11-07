"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, switchCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { demoMode } from "@/lib/auth/mode";
import { verifyPassword } from "@/lib/auth/password.mjs";

export async function loginAsDemoUserAction(userIdOrFormData: string | FormData) {
  const userId = typeof userIdOrFormData === "string"
    ? userIdOrFormData
    : String(userIdOrFormData.get("userId") ?? "");
  if (!userId) redirect("/login");
  await switchCurrentUser(userId);
  redirect("/workspaces");
}

export async function loginWithEmailAction(formData: FormData) {
  if (demoMode) redirect("/login");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || email.length > 254 || !password || password.length > 256) {
    redirect("/login?error=credentials");
  }
  const db = await getDb();
  const { rows } = await db.query<{ id: string; password_hash: string | null }>(
    "SELECT id, password_hash FROM profiles WHERE LOWER(email) = $1 LIMIT 2",
    [email]
  );
  const profile = rows.length === 1 ? rows[0] : undefined;
  const valid = await verifyPassword(password, profile?.password_hash);
  if (!profile || !valid) redirect("/login?error=credentials");
  await createSession(profile.id);
  redirect("/workspaces");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
