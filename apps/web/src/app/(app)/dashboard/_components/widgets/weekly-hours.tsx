import type { ReactNode } from "react";
import { findWeeklySummary } from "@pair/db";
import { formatDuration } from "@/lib/format";
import { StatTile } from "./stat-tile";

export async function renderWeeklyHours(userId: string): Promise<ReactNode> {
  const { totalDurationSeconds } = await findWeeklySummary(userId);
  const thisWeek = totalDurationSeconds.thisWeek;
  const lastWeek = totalDurationSeconds.lastWeek;

  let delta: string;
  if (lastWeek === 0) {
    // Primera semana con datos, no se puede calcular el % de variación.
    delta = "First week with data";
  } else {
    const changePercent = ((thisWeek - lastWeek) / lastWeek) * 100;
    const sign = changePercent >= 0 ? "+" : "−";
    delta = `${sign}${Math.abs(changePercent).toFixed(0)}% vs last week`;
  }

  return <StatTile square label="Training hours" value={formatDuration(thisWeek)} delta={delta} />;
}
