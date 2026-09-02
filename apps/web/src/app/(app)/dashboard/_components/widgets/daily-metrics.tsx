import type { ReactNode } from "react";
import { findRecentDailyMetrics, findTodayMetrics, type DailyMetricsRow } from "@pair/db";
import { formatDuration } from "@/lib/format";
import { buildSparkline } from "@/lib/sparkline";
import { StatTile } from "./stat-tile";

const HISTORY_DAYS = 14;

type MetricKey =
  | "steps"
  | "restingHeartRate"
  | "sleepSeconds"
  | "bodyBattery"
  | "spo2Average"
  | "respirationAvg"
  | "hillScore"
  | "enduranceScore"
  | "vo2MaxRunning"
  | "vo2MaxCycling"
  | "altitudeAcclimationMeters"
  | "weight"
  | "bmi";

const METRICS: Record<MetricKey, { label: string; unit?: string; format: (v: number) => string }> = {
  steps: { label: "Steps", format: (v) => v.toLocaleString() },
  restingHeartRate: { label: "Resting HR", unit: "bpm", format: (v) => String(v) },
  sleepSeconds: { label: "Sleep", format: formatDuration },
  bodyBattery: { label: "Body battery", unit: "/100", format: (v) => String(v) },
  spo2Average: { label: "SpO2", unit: "%", format: (v) => String(v) },
  respirationAvg: { label: "Respiration", unit: "brpm", format: (v) => String(v) },
  hillScore: { label: "Hill score", format: (v) => String(v) },
  enduranceScore: { label: "Endurance score", format: (v) => v.toLocaleString() },
  vo2MaxRunning: { label: "VO2 Max Running", format: (v) => String(v) },
  vo2MaxCycling: { label: "VO2 Max Cycling", format: (v) => String(v) },
  altitudeAcclimationMeters: { label: "Altitude acclimation", unit: "m", format: (v) => String(v) },
  weight: { label: "Weight", format: (v) => v.toFixed(1) },
  bmi: { label: "BMI", format: (v) => v.toFixed(1) },
};

async function renderMetric(userId: string, key: MetricKey): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  if (!today) return null;

  const value = today[key];
  if (value == null) return null;

  // Descarta filas con fecha posterior a "hoy" (residuo de un bug de sync ya corregido).
  const series = (await findRecentDailyMetrics(userId, HISTORY_DAYS)).filter(
    (row) => row.date <= today.date,
  );
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
export const renderSpo2 = (userId: string) => renderMetric(userId, "spo2Average");
export const renderRespiration = (userId: string) => renderMetric(userId, "respirationAvg");
export const renderHillScore = (userId: string) => renderMetric(userId, "hillScore");
export const renderEnduranceScore = (userId: string) => renderMetric(userId, "enduranceScore");
export const renderVo2MaxRunning = (userId: string) => renderMetric(userId, "vo2MaxRunning");
export const renderVo2MaxCycling = (userId: string) => renderMetric(userId, "vo2MaxCycling");
export const renderAltitudeAcclimation = (userId: string) =>
  renderMetric(userId, "altitudeAcclimationMeters");
export const renderWeight = (userId: string) => renderMetric(userId, "weight");
export const renderBmi = (userId: string) => renderMetric(userId, "bmi");
