// Fecha YYYY-MM-DD de `date` en `timeZone`, no en UTC.
export function localDateString(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
