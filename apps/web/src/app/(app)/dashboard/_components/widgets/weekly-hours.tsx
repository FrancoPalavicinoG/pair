import type { ReactNode } from "react";
import { findWeeklySummary } from "@pair/db";
import { formatDuration } from "@pair/core";
import { TileShell, TileValue } from "./stat-tile";
import { WeeklyBarChart } from "./weekly-bar-chart";

export async function renderWeeklyHours(userId: string, square = true): Promise<ReactNode> {
  const { totalDurationSeconds, weekDays } = await findWeeklySummary(userId);
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

  const chartDays = weekDays.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    value: day.total.durationSeconds / 3600,
    isFuture: day.isFuture,
    isToday: day.isToday,
  }));

  return (
    <TileShell label="Training hours" square={square}>
      <TileValue value={formatDuration(thisWeek)} subtitle={delta} tightSubtitle />
      <WeeklyBarChart days={chartDays} />
    </TileShell>
  );
}
