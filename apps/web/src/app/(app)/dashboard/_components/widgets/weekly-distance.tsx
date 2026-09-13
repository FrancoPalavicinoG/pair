import type { ReactNode } from "react";
import { findWeeklySummary, type WeeklyDayBucket } from "@pair/db";
import { formatDistance, formatDuration, formatLabel } from "@/lib/format";
import { TileShell, TileValue } from "./stat-tile";
import { WeeklyBarChart } from "./weekly-bar-chart";

function weekOverWeekDelta(thisWeek: number, lastWeek: number): string {
  if (lastWeek === 0) {
    // Primera semana con datos, no se puede calcular el % de variación.
    return "First week with data";
  }
  const changePercent = ((thisWeek - lastWeek) / lastWeek) * 100;
  const sign = changePercent >= 0 ? "+" : "−";
  return `${sign}${Math.abs(changePercent).toFixed(0)}% vs last week`;
}

const EMPTY_DAY_BUCKET: WeeklyDayBucket = { durationSeconds: 0, distanceMeters: 0 };

export async function renderWeeklyDistance(
  userId: string,
  sportType: string,
  square = true,
): Promise<ReactNode> {
  const { bySport, weekDays } = await findWeeklySummary(userId);
  const bucket = bySport[sportType];
  if (!bucket) return null;

  const label = formatLabel(sportType);
  // Sin distancia GPS (ej. HIIT): el tiempo entrenado aporta más que "0 m". Misma rama decide
  // la unidad del valor principal y la del gráfico de 7 días — nunca mezcla horas y km día a
  // día dentro de un mismo chart.
  const byDuration = bucket.thisWeek.distanceMeters === 0;

  const chartDays = weekDays.map((day) => {
    const dayBucket = day.bySport[sportType] ?? EMPTY_DAY_BUCKET;
    return {
      dayOfWeek: day.dayOfWeek,
      value: byDuration ? dayBucket.durationSeconds / 3600 : dayBucket.distanceMeters / 1000,
      isFuture: day.isFuture,
      isToday: day.isToday,
    };
  });

  const value = byDuration
    ? formatDuration(bucket.thisWeek.durationSeconds)
    : formatDistance(bucket.thisWeek.distanceMeters);
  const delta = byDuration
    ? weekOverWeekDelta(bucket.thisWeek.durationSeconds, bucket.lastWeek.durationSeconds)
    : weekOverWeekDelta(bucket.thisWeek.distanceMeters, bucket.lastWeek.distanceMeters);

  return (
    <TileShell label={label} square={square}>
      <TileValue value={value} subtitle={delta} tightSubtitle />
      <WeeklyBarChart days={chartDays} />
    </TileShell>
  );
}
