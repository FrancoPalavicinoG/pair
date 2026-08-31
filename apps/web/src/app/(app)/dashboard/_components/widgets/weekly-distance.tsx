import type { ReactNode } from "react";
import { findWeeklySummary } from "@pair/db";
import { formatDistance, formatSportType } from "@/lib/format";
import { StatTile } from "./stat-tile";

export async function renderWeeklyDistance(userId: string, sportType: string): Promise<ReactNode> {
  const { bySport } = await findWeeklySummary(userId);
  const bucket = bySport[sportType];
  if (!bucket) return null;

  const thisWeekDistance = bucket.thisWeek.distanceMeters;
  const lastWeekDistance = bucket.lastWeek.distanceMeters;

  let delta: string;
  if (lastWeekDistance === 0) {
    // Primera semana con datos, no se puede calcular el % de variación.
    delta = "First week with data";
  } else {
    const changePercent = ((thisWeekDistance - lastWeekDistance) / lastWeekDistance) * 100;
    const sign = changePercent >= 0 ? "+" : "−";
    delta = `${sign}${Math.abs(changePercent).toFixed(0)}% vs last week`;
  }

  return (
    <StatTile
      square
      label={formatSportType(sportType)}
      value={formatDistance(thisWeekDistance)}
      delta={delta}
    />
  );
}
