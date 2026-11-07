import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { DEMO_USERS, type UserProfile } from "./mock-users";
import { demoMode } from "./mode";
import { getDb } from "@/lib/server/db";

export { DEMO_USERS, getDemoUser, type UserProfile } from "./mock-users";

const cookieName = demoMode ? "mach_nguon_demo_v2" : "mach_nguon_session_v2";
const sessionDurationSeconds = 30 * 24 * 60 * 60;

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const getCurrentUserOptional = cache(async (): Promise<UserProfile | null> => {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

  const db = await getDb();
  const { rows } = await db.query<{
    id: string; email: string; full_name: string; avatar_url: string | null;
  }>(
    `SELECT p.id, p.email, p.full_name, p.avatar_url
     FROM user_sessions s JOIN profiles p ON p.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [digest(token)]
  );
  const profile = rows[0];
  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url ?? undefined,
    roleDescription: "Thành viên gia đình",
  };
});

export async function getCurrentUserIdOptional(): Promise<string | null> {
  return (await getCurrentUserOptional())?.id ?? null;
}

export async function getCurrentUser(): Promise<UserProfile> {
  const user = await getCurrentUserOptional();
  if (!user) redirect("/login");
  return user;
}

export async function getCurrentUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const db = await getDb();
  const cookieStore = await cookies();
  const previous = cookieStore.get(cookieName)?.value;
  await db.transaction(async (tx) => {
    if (previous) await tx.query("DELETE FROM user_sessions WHERE token = $1", [digest(previous)]);
    await tx.query(
      "INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [userId, digest(token), new Date(Date.now() + sessionDurationSeconds * 1000).toISOString()]
    );
  });
  cookieStore.set(cookieName, token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !demoMode,
    sameSite: "lax",
    maxAge: sessionDurationSeconds,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (token) {
    const db = await getDb();
    await db.query("DELETE FROM user_sessions WHERE token = $1", [digest(token)]);
  }
  cookieStore.delete(cookieName);
}

export async function switchCurrentUser(userId: string): Promise<void> {
  if (!DEMO_USERS.some((user) => user.id === userId)) {
    throw new Error("Tài khoản thành viên không tồn tại trong hệ thống.");
  }
  await createSession(userId);
}
