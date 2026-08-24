import { eq, desc, and } from "drizzle-orm";
import { db } from "../client";
import { activities } from "../schema/activities";

export type NewActivity = typeof activities.$inferInsert;

export async function findRecentActivities(userId: string, limit: number) {
  return await db
    .select()
    .from(activities)
    .where(eq(activities.userId, userId))
    .orderBy(desc(activities.startTimeUtc))
    .limit(limit);
}

export async function findActivityByGarminId(userId: string, garminActivityId: number) {
  const [row] = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.userId, userId),
        eq(activities.garminActivityId, garminActivityId),
      ),
    );
  return row ?? null;
}

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
