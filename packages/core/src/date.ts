// Fecha YYYY-MM-DD de `date` en `timeZone`, no en UTC.
export function localDateString(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

// Suma/resta días a un YYYY-MM-DD operando sobre los componentes, nunca sobre un instante
// real — para caminar fechas-calendario sin que un paso de "24h" se desalinee del día de
// calendario en la zona del usuario (ver packages/sync: syncDailyMetrics).
export function addDaysToDateString(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// Garmin manda timestamps "sin zona" en dos formatos — "YYYY-MM-DD HH:MM:SS" (actividades)
// y "YYYY-MM-DDTHH:MM:SS.s" (sleepLevels) — que en realidad son UTC. `new Date(string)` los
// interpreta con la zona del *proceso que corre el código*, no como UTC literal (bug real
// encontrado en 2026-09-02, docs/garmin-api.md). Parsear siempre los componentes a mano.
export function parseGarminUtcTimestamp(raw: string): Date {
  const [datePart, timePart] = raw.replace("T", " ").split(" ");
  const [year, month, day] = (datePart ?? "").split("-").map(Number);
  const [hour, minute, second] = (timePart ?? "").split(":").map((v) => Number(v));
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, Math.trunc(second ?? 0)));
}
