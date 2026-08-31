import type { ReactNode } from "react";
import { findRecentDailyMetrics, type DailyMetricsRow } from "@pair/db";
import { formatDuration } from "@/lib/format";
import { buildSparkline } from "@/lib/sparkline";
import { StatTile } from "./stat-tile";

const HISTORY_DAYS = 14;

type MetricKey = "steps" | "restingHeartRate" | "sleepSeconds" | "bodyBattery";

const METRICS: Record<MetricKey, { label: string; unit?: string; format: (v: number) => string }> = {
  steps: { label: "Steps", format: (v) => v.toLocaleString() },
  restingHeartRate: { label: "Resting HR", unit: "bpm", format: (v) => String(v) },
  sleepSeconds: { label: "Sleep", format: formatDuration },
  bodyBattery: { label: "Body battery", unit: "/100", format: (v) => String(v) },
};

async function renderMetric(userId: string, key: MetricKey): Promise<ReactNode> {
  const series = await findRecentDailyMetrics(userId, HISTORY_DAYS);
  const today = series[series.length - 1];
  if (!today) return null;

  const value = today[key];
  if (value == null) return null;

  const yesterday: DailyMetricsRow | undefined = series[series.length - 2];
  const previous = yesterday?.[key];
  const { label, unit, format } = METRICS[key];
  const delta =
    previous == null
      ? "First day with data"
      : `${value >= previous ? "+" : "−"}${format(Math.abs(value - previous))} vs yesterday`;

  const sparkline = buildSparkline(series.map((row) => row[key] ?? null));

  return <StatTile square label={label} value={format(value)} unit={unit} delta={delta} sparkline={sparkline} />;
}

export const renderSteps = (userId: string) => renderMetric(userId, "steps");
export const renderRestingHr = (userId: string) => renderMetric(userId, "restingHeartRate");
export const renderSleep = (userId: string) => renderMetric(userId, "sleepSeconds");
export const renderBodyBattery = (userId: string) => renderMetric(userId, "bodyBattery");
