import { eq } from "drizzle-orm";
import { DatabaseError } from "@pair/core";
import { db } from "../client";
import { users } from "../schema/users";

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ?? null;
}

export async function createUser(email: string, passwordHash: string) {
  const [created] = await db.insert(users).values({ email, passwordHash }).returning();
  if (!created) throw new DatabaseError("Failed to create user");
  return created;
}
