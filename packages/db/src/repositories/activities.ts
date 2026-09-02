import { eq, desc, and, gte, lte, isNull, inArray } from "drizzle-orm";
import { db } from "../client";
import { activities } from "../schema/activities";
import { findUserTimezone } from "./users";

export type NewActivity = typeof activities.$inferInsert;
export type Activity = typeof activities.$inferSelect;

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
    .where(and(eq(activities.userId, userId), eq(activities.garminActivityId, garminActivityId)));
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

export type WeeklySportBucket = { distanceMeters: number; activityCount: number };

export type WeeklySummary = {
  totalDurationSeconds: { thisWeek: number; lastWeek: number };
  bySport: Record<string, { thisWeek: WeeklySportBucket; lastWeek: WeeklySportBucket }>;
};

// Offset UTC real (en minutos) de `timeZone` en el instante `date`. Usa el offset que ICU calcula
// para esa fecha puntual, así que no hay que saber a mano si aplica horario de verano o invierno.
function getUtcOffsetMinutes(date: Date, timeZone: string): number {
  const offsetPart = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value; // "GMT-3" o "GMT-4"
  const hours = Number(offsetPart?.replace("GMT", "") ?? 0);
  return hours * 60;
}

export function getWeekBounds(
  now: Date,
  timeZone: string,
): {
  thisWeekStart: Date;
  thisWeekEnd: Date;
  lastWeekStart: Date;
  lastWeekEnd: Date;
} {
  const offsetMinutes = getUtcOffsetMinutes(now, timeZone);

  // Corremos "now" por el offset: sus getters UTC quedan leyendo la hora local del usuario.
  const shifted = new Date(now.getTime() + offsetMinutes * 60_000);

  // getUTCDay() da domingo=0..sábado=6; lo convertimos a lunes=0..domingo=6.
  const daysSinceMonday = (shifted.getUTCDay() + 6) % 7;
  const shiftedMonday = new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() - daysSinceMonday,
    ),
  );

  // Restamos el offset de nuevo para volver a un instante UTC real.
  const thisWeekStart = new Date(shiftedMonday.getTime() - offsetMinutes * 60_000);
  const oneWeekMs = 7 * 24 * 60 * 60_000;

  return {
    thisWeekStart,
    thisWeekEnd: now,
    lastWeekStart: new Date(thisWeekStart.getTime() - oneWeekMs),
    lastWeekEnd: new Date(now.getTime() - oneWeekMs),
  };
}

export async function findWeeklySummary(userId: string): Promise<WeeklySummary> {
  const timezone = await findUserTimezone(userId);
  const bounds = getWeekBounds(new Date(), timezone);
  const rows = await db
    .select({
      startTimeUtc: activities.startTimeUtc,
      distanceMeters: activities.distanceMeters,
      durationSeconds: activities.durationSeconds,
      sportType: activities.sportType,
    })
    .from(activities)
    .where(
      and(
        eq(activities.userId, userId),
        isNull(activities.deletedAt),
        gte(activities.startTimeUtc, bounds.lastWeekStart),
        lte(activities.startTimeUtc, bounds.thisWeekEnd),
      ),
    );

  const summary: WeeklySummary = {
    totalDurationSeconds: { thisWeek: 0, lastWeek: 0 },
    bySport: {},
  };

  for (const row of rows) {
    const sport = row.sportType ?? "other";
    summary.bySport[sport] ??= {
      thisWeek: { distanceMeters: 0, activityCount: 0 },
      lastWeek: { distanceMeters: 0, activityCount: 0 },
    };

    if (row.startTimeUtc >= bounds.thisWeekStart) {
      summary.bySport[sport].thisWeek.distanceMeters += row.distanceMeters ?? 0;
      summary.bySport[sport].thisWeek.activityCount += 1;
      summary.totalDurationSeconds.thisWeek += row.durationSeconds ?? 0;
    } else {
      // El WHERE ya acota las filas a [lastWeekStart, thisWeekEnd]: cualquier fila que
      // no sea "esta semana" cae necesariamente en la semana pasada completa (lunes-domingo).
      summary.bySport[sport].lastWeek.distanceMeters += row.distanceMeters ?? 0;
      summary.bySport[sport].lastWeek.activityCount += 1;
      summary.totalDurationSeconds.lastWeek += row.durationSeconds ?? 0;
    }
  }

  return summary;
}

// Mismo criterio de shift/trunca/deshift que getWeekBounds, pero al 1ro del mes.
function getMonthStart(now: Date, timeZone: string): Date {
  const offsetMinutes = getUtcOffsetMinutes(now, timeZone);
  const shifted = new Date(now.getTime() + offsetMinutes * 60_000);
  const shiftedMonthStart = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1));
  return new Date(shiftedMonthStart.getTime() - offsetMinutes * 60_000);
}

export type ActivityRange = "this_week" | "this_month" | "all";

// Para /activities: filtra por categoría (ya resuelta a sportTypes en apps/web,
// packages/db no conoce ActivityCategory) y por rango de fecha, en un solo WHERE.
export async function findActivities(
  userId: string,
  { limit, sportTypes, range }: { limit: number; sportTypes?: string[]; range?: ActivityRange },
) {
  const conditions = [eq(activities.userId, userId), isNull(activities.deletedAt)];

  if (sportTypes && sportTypes.length > 0) {
    conditions.push(inArray(activities.sportType, sportTypes));
  }

  if (range === "this_week" || range === "this_month") {
    const timezone = await findUserTimezone(userId);
    const now = new Date();
    const cutoff =
      range === "this_week" ? getWeekBounds(now, timezone).thisWeekStart : getMonthStart(now, timezone);
    conditions.push(gte(activities.startTimeUtc, cutoff));
  }

  return await db
    .select()
    .from(activities)
    .where(and(...conditions))
    .orderBy(desc(activities.startTimeUtc))
    .limit(limit);
}
