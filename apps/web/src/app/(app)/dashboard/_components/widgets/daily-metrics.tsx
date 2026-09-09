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

type RenderMetricOptions = {
  historyDays?: number;
  compareLabel?: string;
  // Compara contra el punto más viejo de la ventana que sí tenga el dato (no necesariamente
  // el primer día de la ventana: si la métrica empezó a registrarse a mitad de la ventana,
  // los días anteriores existen en `daily_metrics` para otras métricas pero vienen null acá)
  // en vez de contra ayer — para métricas que casi no varían día a día (ej. VO2 Max), donde
  // "vs yesterday" no dice nada útil y conviene una ventana más larga
  // (docs/specs/app-dashboard-widgets-v2.md).
  compareToRangeStart?: boolean;
  noDataLabel?: string;
};

async function renderMetric(
  userId: string,
  key: MetricKey,
  options: RenderMetricOptions = {},
  square = true,
): Promise<ReactNode> {
  const {
    historyDays = HISTORY_DAYS,
    compareLabel = "yesterday",
    compareToRangeStart = false,
    noDataLabel = "First day with data",
  } = options;

  const today = await findTodayMetrics(userId);
  if (!today) return null;

  const value = today[key];
  if (value == null) return null;

  // Descarta filas con fecha posterior a "hoy" (residuo de un bug de sync ya corregido).
  const series = (await findRecentDailyMetrics(userId, historyDays)).filter(
    (row) => row.date <= today.date,
  );
  const comparisonRow: DailyMetricsRow | undefined = compareToRangeStart
    ? series.slice(0, -1).find((row) => row[key] != null)
    : series[series.length - 2];
  const previous = comparisonRow?.[key];
  const { label, unit, format } = METRICS[key];
  const delta =
    previous == null
      ? noDataLabel
      : `${value >= previous ? "+" : "−"}${format(Math.abs(value - previous))} vs ${compareLabel}`;

  const sparkline = buildSparkline(series.map((row) => row[key] ?? null));

  return (
    <StatTile square={square} label={label} value={format(value)} unit={unit} delta={delta} sparkline={sparkline} />
  );
}

export const renderSteps = (userId: string, square?: boolean) => renderMetric(userId, "steps", {}, square);
export const renderRestingHr = (userId: string, square?: boolean) =>
  renderMetric(userId, "restingHeartRate", {}, square);
export const renderSleep = (userId: string, square?: boolean) => renderMetric(userId, "sleepSeconds", {}, square);
export const renderBodyBattery = (userId: string, square?: boolean) =>
  renderMetric(userId, "bodyBattery", {}, square);
export const renderSpo2 = (userId: string, square?: boolean) => renderMetric(userId, "spo2Average", {}, square);
export const renderRespiration = (userId: string, square?: boolean) =>
  renderMetric(userId, "respirationAvg", {}, square);
export const renderHillScore = (userId: string, square?: boolean) => renderMetric(userId, "hillScore", {}, square);
export const renderEnduranceScore = (userId: string, square?: boolean) =>
  renderMetric(userId, "enduranceScore", {}, square);
export const renderVo2MaxRunning = (userId: string, square?: boolean) =>
  renderMetric(
    userId,
    "vo2MaxRunning",
    {
      historyDays: 30,
      compareLabel: "last month",
      compareToRangeStart: true,
      noDataLabel: "First month with data",
    },
    square,
  );
export const renderVo2MaxCycling = (userId: string, square?: boolean) =>
  renderMetric(userId, "vo2MaxCycling", {}, square);
export const renderAltitudeAcclimation = (userId: string, square?: boolean) =>
  renderMetric(userId, "altitudeAcclimationMeters", {}, square);
export const renderWeight = (userId: string, square?: boolean) => renderMetric(userId, "weight", {}, square);
export const renderBmi = (userId: string, square?: boolean) => renderMetric(userId, "bmi", {}, square);
