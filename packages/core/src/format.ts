export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatPace(speedMps: number): string {
  if (speedMps <= 0) {
    return "-";
  }
  const paceSecondsPerKm = 1000 / speedMps;
  const totalSeconds = Math.round(paceSecondsPerKm);
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

export function formatSpeed(speedMps: number): string {
  return `${(speedMps * 3.6).toFixed(1)} km/h`;
}

// Prettifica texto tipo enum de Garmin ("STRAINED_1", "running") a algo mostrable
// ("Strained 1", "Running") sin traducir a mano — no tenemos la lista completa de
// valores que Garmin puede devolver para ningún campo de este tipo.
export function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Hora de reloj ("11:29 PM") a partir de un ISO cuyo instante ya representa la hora local
// empaquetada como UTC (SleepStageSegment.startLocal/endLocal, @pair/core) — por eso usa
// los getters UTC del Date y no los locales, que la corrarían de nuevo con la zona del navegador.
export function formatClockTime(iso: string): string {
  const date = new Date(iso);
  const hours24 = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(0)} s`;
  } else if (seconds < 3600) {
    const totalSeconds = Math.round(seconds);
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")} min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${min.toString().padStart(2, "0")}m`;
  }
}
