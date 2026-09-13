import { eq } from "drizzle-orm";
import { db } from "../client";
import { userProfile } from "../schema/user-profile";

export type UserProfileRow = typeof userProfile.$inferInsert;

export async function findUserProfile(userId: string): Promise<UserProfileRow | null> {
  const [row] = await db.select().from(userProfile).where(eq(userProfile.userId, userId));
  return row ?? null;
}

export async function upsertUserProfile(row: UserProfileRow): Promise<void> {
  await db.insert(userProfile).values(row).onConflictDoUpdate({
    target: userProfile.userId,
    set: row,
  });
}
