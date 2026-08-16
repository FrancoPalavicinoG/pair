import { eq } from "drizzle-orm";
import { db } from "../client";
import { sessions } from "../schema/sessions";

export async function createSession(userId: string, expiresAt: Date) {
  const [created] = await db.insert(sessions).values({ userId, expiresAt }).returning();
  return created ?? null;
}

export async function findValidSession(id: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  return session;
}

export async function deleteSession(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}

export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
