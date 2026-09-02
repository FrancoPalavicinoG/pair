import { eq } from "drizzle-orm";
import { DatabaseError } from "@pair/core";
import { db } from "../client";
import { users } from "../schema/users";

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ?? null;
}

export async function findUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}

export async function createUser(email: string, passwordHash: string) {
  const [created] = await db.insert(users).values({ email, passwordHash }).returning();
  if (!created) throw new DatabaseError("Failed to create user");
  return created;
}

// Trae solo la columna timezone, sin el resto de la fila.
export async function findUserTimezone(userId: string): Promise<string> {
  const [row] = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId));
  return row?.timezone ?? "America/Santiago";
}

export async function updateUserTimezone(userId: string, timezone: string): Promise<void> {
  await db.update(users).set({ timezone }).where(eq(users.id, userId));
}
