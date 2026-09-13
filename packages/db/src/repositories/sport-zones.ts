import { eq } from "drizzle-orm";
import { db } from "../client";
import { sportZones } from "../schema/sport-zones";

export type SportZoneRow = typeof sportZones.$inferInsert;

export async function findSportZones(userId: string): Promise<SportZoneRow[]> {
  return await db.select().from(sportZones).where(eq(sportZones.userId, userId));
}

export async function upsertSportZone(row: SportZoneRow): Promise<void> {
  await db
    .insert(sportZones)
    .values(row)
    .onConflictDoUpdate({
      target: [sportZones.userId, sportZones.sport],
      set: row,
    });
}
