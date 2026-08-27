import type { ReactNode } from "react";
import { findRecentDailyMetrics, type DailyMetricsRow } from "@pair/db";
import { formatDuration } from "@/lib/format";
import { buildSparkline } from "@/lib/sparkline";
import { StatTile } from "./stat-tile";

const HISTORY_DAYS = 14;

type MetricKey = "steps" | "restingHeartRate" | "sleepSeconds" | "bodyBattery";

const METRICS: { key: MetricKey; label: string; unit?: string; format: (v: number) => string }[] = [
  { key: "steps", label: "Steps", format: (v) => v.toLocaleString() },
  { key: "restingHeartRate", label: "Resting HR", unit: "bpm", format: (v) => String(v) },
  { key: "sleepSeconds", label: "Sleep", format: formatDuration },
  { key: "bodyBattery", label: "Body battery", unit: "/100", format: (v) => String(v) },
];

export async function renderTodayMetrics(userId: string): Promise<ReactNode> {
  const series = await findRecentDailyMetrics(userId, HISTORY_DAYS);
  const today = series[series.length - 1];
  if (!today) return null;

  const yesterday: DailyMetricsRow | undefined = series[series.length - 2];

  const tiles = METRICS.flatMap(({ key, label, unit, format }) => {
    const value = today[key];
    if (value == null) return [];

    const previous = yesterday?.[key];
    const delta =
      previous == null
        ? "First day with data"
        : `${value >= previous ? "+" : "−"}${format(Math.abs(value - previous))} vs yesterday`;

    const sparkline = buildSparkline(series.map((row) => row[key] ?? null));

    return (
      <StatTile
        key={key}
        label={label}
        value={format(value)}
        unit={unit}
        delta={delta}
        sparkline={sparkline}
      />
    );
  });

  if (tiles.length === 0) return null;

  return <div className="grid grid-cols-2 gap-px bg-rule-soft sm:grid-cols-4">{tiles}</div>;
}
