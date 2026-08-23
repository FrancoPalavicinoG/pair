import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSession as insertSession,
  findValidSession,
  deleteSession as removeSession,
} from "@pair/db";
import { DatabaseError } from "@pair/core";

const SESSION_COOKIE_NAME = "pair_session";
const SESSION_DURATION_DAYS = 30;

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const session = await insertSession(userId, expiresAt);
  if (!session) throw new DatabaseError("Failed to create session");

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    session.id,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    }
  ) 
}

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie) return null;
  return await findValidSession(cookie.value) ?? null; 
});

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie) return;
  
  await removeSession(cookie.value);
  cookieStore.delete(SESSION_COOKIE_NAME);
}
