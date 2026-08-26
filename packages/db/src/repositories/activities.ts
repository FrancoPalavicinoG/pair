import { eq, desc, and, gte, lte, isNull } from "drizzle-orm";
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

export type WeeklySummary = {
  thisWeek: { distanceMeters: number; activityCount: number };
  lastWeek: { distanceMeters: number; activityCount: number };
};

// Zona horaria para calcular el corte de semana. Único lugar a tocar si esto deja de ser Chile.
const WEEK_BOUNDS_TIMEZONE = "America/Santiago";

// Offset UTC real (en minutos) de `timeZone` en el instante `date`. Usa el offset que ICU calcula
// para esa fecha puntual, así que no hay que saber a mano si aplica horario de verano o invierno.
function getUtcOffsetMinutes(date: Date, timeZone: string): number {
  const offsetPart = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value; // "GMT-3" o "GMT-4"
  const hours = Number(offsetPart?.replace("GMT", "") ?? 0);
  return hours * 60;
}

export function getWeekBounds(now: Date): {
  thisWeekStart: Date;
  thisWeekEnd: Date;
  lastWeekStart: Date;
  lastWeekEnd: Date;
} {
  const offsetMinutes = getUtcOffsetMinutes(now, WEEK_BOUNDS_TIMEZONE);

  // Corremos "now" por el offset: sus getters UTC quedan leyendo la hora local de Chile,
  // así podemos hacer la aritmética del lunes con Date.UTC en vez de manejar zonas a mano.
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
  const bounds = getWeekBounds(new Date());
  const rows = await db
    .select({
      startTimeUtc: activities.startTimeUtc,
      distanceMeters: activities.distanceMeters,
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
    thisWeek: { distanceMeters: 0, activityCount: 0 },
    lastWeek: { distanceMeters: 0, activityCount: 0 },
  };

  for (const row of rows) {
    if (row.startTimeUtc >= bounds.thisWeekStart) {
      summary.thisWeek.distanceMeters += row.distanceMeters ?? 0;
      summary.thisWeek.activityCount += 1;
    } else if (row.startTimeUtc <= bounds.lastWeekEnd) {
      summary.lastWeek.distanceMeters += row.distanceMeters ?? 0;
      summary.lastWeek.activityCount += 1;
    }
  }

  return summary;
}
