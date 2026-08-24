import { eq, desc, and } from "drizzle-orm";
import { db } from "../client";
import { dailyMetrics } from "../schema/daily-metrics";

export type DailyMetricsRow = typeof dailyMetrics.$inferInsert;

export async function findTodayMetrics(userId: string) {
  const today = new Date().toISOString().slice(0, 10); // mismo formato que ya usa la columna "date"
  const [row] = await db
    .select()
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, userId), eq(dailyMetrics.date, today)));
  return row ?? null;
}

export async function findMostRecentMetricsDate(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ date: dailyMetrics.date })
    .from(dailyMetrics)
    .where(eq(dailyMetrics.userId, userId))
    .orderBy(desc(dailyMetrics.date))
    .limit(1);
  return row?.date ?? null;
}

export async function upsertDailyMetrics(row: DailyMetricsRow): Promise<void> {
  await db
    .insert(dailyMetrics)
    .values(row)
    .onConflictDoUpdate({
      target: [dailyMetrics.userId, dailyMetrics.date],
      set: { ...row, updatedAt: new Date() },
    });
}
