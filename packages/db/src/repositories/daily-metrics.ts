import { eq, desc, asc, and, gte } from "drizzle-orm";
import { localDateString, trainingReadinessListSchema } from "@pair/core";
import { db } from "../client";
import { dailyMetrics } from "../schema/daily-metrics";
import { findUserTimezone } from "./users";

export type DailyMetricsRow = typeof dailyMetrics.$inferInsert;

/** Ultimos `days` dias de metricas de un usuario, ordenados de mas viejo a mas nuevo. */
export async function findRecentDailyMetrics(
  userId: string,
  days: number,
): Promise<DailyMetricsRow[]> {
  const timezone = await findUserTimezone(userId);
  const cutoff = localDateString(new Date(Date.now() - days * 24 * 60 * 60 * 1000), timezone);
  return await db
    .select()
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, userId), gte(dailyMetrics.date, cutoff)))
    .orderBy(asc(dailyMetrics.date));
}

export async function findTodayMetrics(userId: string) {
  const timezone = await findUserTimezone(userId);
  const today = localDateString(new Date(), timezone); // mismo formato que ya usa la columna "date"
  const [row] = await db
    .select()
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, userId), eq(dailyMetrics.date, today)));
  return row ?? null;
}

export type ReadinessFactors = {
  score: number | null;
  level: string | null;
  feedbackShort: string | null;
  sleep: string | null;
  sleepHistory: string | null;
  hrv: string | null;
  acwr: string | null;
  recoveryTime: string | null;
  stressHistory: string | null;
};

// El readiness crudo de hoy vive en daily_metrics.raw.readiness (packages/sync lo guarda
// sin recortar) — es dato que el dashboard solo muestra, nunca filtra ni ordena, así que
// queda en el JSONB en vez de columnas nuevas (packages/db/CLAUDE.md). Garmin recalcula el
// readiness varias veces al dia; se toma la entrada de mayor `timestampLocal`, mismo
// criterio que ya usa packages/sync para readinessScore/readinessLevel.
export async function findReadinessFactors(userId: string): Promise<ReadinessFactors | null> {
  const today = await findTodayMetrics(userId);
  const raw = today?.raw as { readiness?: unknown } | undefined;
  if (!raw?.readiness) return null;

  const parsed = trainingReadinessListSchema.safeParse(raw.readiness);
  if (!parsed.success || parsed.data.length === 0) return null;

  const latest = parsed.data.reduce((latest, entry) =>
    entry.timestampLocal > latest.timestampLocal ? entry : latest,
  );

  return {
    score: latest.score ?? null,
    level: latest.level ?? null,
    feedbackShort: latest.feedbackShort ?? null,
    sleep: latest.sleepScoreFactorFeedback ?? null,
    sleepHistory: latest.sleepHistoryFactorFeedback ?? null,
    hrv: latest.hrvFactorFeedback ?? null,
    acwr: latest.acwrFactorFeedback ?? null,
    recoveryTime: latest.recoveryTimeFactorFeedback ?? null,
    stressHistory: latest.stressHistoryFactorFeedback ?? null,
  };
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
