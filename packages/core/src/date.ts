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
