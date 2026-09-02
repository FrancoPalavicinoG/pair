// `startTimeLocal` es un timestamp sin zona horaria, guardado tal cual lo reporta Garmin
// (packages/db/src/schema/activities.ts) — se lee con getters UTC, no locales, para no
// aplicarle la zona del proceso que lo lee (mismo bug de clase que el fix de "hoy").
export function localDateFromTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Hora del día ("14:32") a partir de startTimeLocal, mismos getters UTC que localDateFromTimestamp.
export function formatActivityTime(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatAbsoluteDate(dateStr: string, currentYear: number): string {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? currentYear;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(Date.UTC(year, month - 1, day));
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  if (year !== currentYear) options.year = "numeric";
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

// "Today" / "Yesterday" / fecha absoluta ("Aug 30", o "Aug 30, 2025" si no es el año actual).
export function dayLabel(dateStr: string, todayLocalDate: string, yesterdayLocalDate: string): string {
  if (dateStr === todayLocalDate) return "Today";
  if (dateStr === yesterdayLocalDate) return "Yesterday";
  return formatAbsoluteDate(dateStr, Number(todayLocalDate.slice(0, 4)));
}

export type ActivityDateGroup<T> = { label: string; items: T[] };

// Agrupa por la fecha cruda primero (nunca por el label ya formateado, para no arriesgar
// que dos fechas distintas colisionen en el mismo texto) y arma el label recién después.
// Asume que `activities` ya viene ordenado desc (como devuelve findActivities).
export function groupActivitiesByDate<T extends { startTimeLocal: Date }>(
  activities: T[],
  todayLocalDate: string,
  yesterdayLocalDate: string,
): ActivityDateGroup<T>[] {
  const groups: { dateStr: string; items: T[] }[] = [];

  for (const activity of activities) {
    const dateStr = localDateFromTimestamp(activity.startTimeLocal);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.dateStr === dateStr) {
      lastGroup.items.push(activity);
    } else {
      groups.push({ dateStr, items: [activity] });
    }
  }

  return groups.map((group) => ({
    label: dayLabel(group.dateStr, todayLocalDate, yesterdayLocalDate),
    items: group.items,
  }));
}
