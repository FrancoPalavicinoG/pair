import type { ReactNode } from "react";
import { findWeeklySummary } from "@pair/db";
import { formatDistance } from "@/lib/format";
import { StatTile } from "./stat-tile";

export async function renderWeeklySummary(userId: string): Promise<ReactNode> {
  const summary = await findWeeklySummary(userId);

  let deltaText: string;
  const thisWeekDistance = summary.thisWeek.distanceMeters;
  const lastWeekDistance = summary.lastWeek.distanceMeters;

  if (lastWeekDistance === 0) {
    // Primera semana con datos, no se puede calcular el % de variación.
    deltaText = "First week with data";
  } else {
    const changePercent = ((thisWeekDistance - lastWeekDistance) / lastWeekDistance) * 100;
    const sign = changePercent >= 0 ? "+" : "−";
    deltaText = `${sign}${Math.abs(changePercent).toFixed(0)}% vs last week`;
  }

  return <StatTile label="This week" value={formatDistance(thisWeekDistance)} delta={deltaText} />;
}
