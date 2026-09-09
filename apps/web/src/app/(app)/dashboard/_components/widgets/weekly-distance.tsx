import type { ReactNode } from "react";
import { findWeeklySummary } from "@pair/db";
import { formatDistance, formatDuration, formatLabel } from "@/lib/format";
import { StatTile } from "./stat-tile";

function weekOverWeekDelta(thisWeek: number, lastWeek: number): string {
  if (lastWeek === 0) {
    // Primera semana con datos, no se puede calcular el % de variación.
    return "First week with data";
  }
  const changePercent = ((thisWeek - lastWeek) / lastWeek) * 100;
  const sign = changePercent >= 0 ? "+" : "−";
  return `${sign}${Math.abs(changePercent).toFixed(0)}% vs last week`;
}

export async function renderWeeklyDistance(userId: string, sportType: string): Promise<ReactNode> {
  const { bySport } = await findWeeklySummary(userId);
  const bucket = bySport[sportType];
  if (!bucket) return null;

  const label = formatLabel(sportType);

  // Sin distancia GPS (ej. HIIT): el tiempo entrenado aporta más que "0 m".
  if (bucket.thisWeek.distanceMeters === 0) {
    return (
      <StatTile
        square
        label={label}
        value={formatDuration(bucket.thisWeek.durationSeconds)}
        delta={weekOverWeekDelta(bucket.thisWeek.durationSeconds, bucket.lastWeek.durationSeconds)}
      />
    );
  }

  return (
    <StatTile
      square
      label={label}
      value={formatDistance(bucket.thisWeek.distanceMeters)}
      delta={weekOverWeekDelta(bucket.thisWeek.distanceMeters, bucket.lastWeek.distanceMeters)}
    />
  );
}
