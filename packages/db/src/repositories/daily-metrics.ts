import { eq, desc, asc, and, gte } from "drizzle-orm";
import { db } from "../client";
import { dailyMetrics } from "../schema/daily-metrics";

export type DailyMetricsRow = typeof dailyMetrics.$inferInsert;

/** Ultimos `days` dias de metricas de un usuario, ordenados de mas viejo a mas nuevo. */
export async function findRecentDailyMetrics(
  userId: string,
  days: number,
): Promise<DailyMetricsRow[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return await db
    .select()
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, userId), gte(dailyMetrics.date, cutoff)))
    .orderBy(asc(dailyMetrics.date));
}

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
