import { eq, desc } from "drizzle-orm";
import { db } from "../client";
import { activities } from "../schema/activities";

export type NewActivity = typeof activities.$inferInsert;

export async function findMostRecentActivityId(userId: string): Promise<number | null> {
  const [row] = await db
    .select({ garminActivityId: activities.garminActivityId })
    .from(activities)
    .where(eq(activities.userId, userId))
    .orderBy(desc(activities.startTimeUtc))
    .limit(1);
  return row?.garminActivityId ?? null;
}

export async function insertActivity(activity: NewActivity): Promise<void> {
  await db
    .insert(activities)
    .values(activity)
    .onConflictDoNothing({ target: [activities.userId, activities.garminActivityId] });
}
