import type { ReactNode } from "react";
import { findRecentDailyMetrics, findTodayMetrics } from "@pair/db";
import { formatDuration } from "@pair/core";
import { buildSparkline } from "@/lib/sparkline";
import { StatTile, TileShell } from "./stat-tile";
import { ZoneGaugeChart, type ZoneGaugeZone } from "@/components/zone-gauge-chart";

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
  | "vo2MaxCycling"
  | "altitudeAcclimationMeters"
  | "weight"
  | "bmi";

const METRICS: Record<MetricKey, { label: string; unit?: string; format: (v: number) => string }> =
  {
    steps: { label: "Steps", format: (v) => v.toLocaleString() },
    restingHeartRate: { label: "Resting HR", unit: "bpm", format: (v) => String(v) },
    sleepSeconds: { label: "Sleep", format: formatDuration },
    bodyBattery: { label: "Body battery", unit: "/100", format: (v) => String(v) },
    spo2Average: { label: "SpO2", unit: "%", format: (v) => String(v) },
    respirationAvg: { label: "Respiration", unit: "brpm", format: (v) => String(v) },
    hillScore: { label: "Hill score", format: (v) => String(v) },
    enduranceScore: { label: "Endurance score", format: (v) => v.toLocaleString() },
    vo2MaxCycling: { label: "VO2 Max Cycling", format: (v) => String(v) },
    altitudeAcclimationMeters: {
      label: "Altitude acclimation",
      unit: "m",
      format: (v) => String(v),
    },
    weight: { label: "Weight", format: (v) => v.toFixed(1) },
    bmi: { label: "BMI", format: (v) => v.toFixed(1) },
  };

async function renderMetric(userId: string, key: MetricKey, square = true): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  if (!today) return null;

  const value = today[key];
  if (value == null) return null;

  // Descarta filas con fecha posterior a "hoy" (residuo de un bug de sync ya corregido).
  const series = (await findRecentDailyMetrics(userId, HISTORY_DAYS)).filter(
    (row) => row.date <= today.date,
  );
  const previous = series[series.length - 2]?.[key];
  const { label, unit, format } = METRICS[key];
  const delta =
    previous == null
      ? "First day with data"
      : `${value >= previous ? "+" : "−"}${format(Math.abs(value - previous))} vs yesterday`;

  const sparkline = buildSparkline(series.map((row) => row[key] ?? null));

  return (
    <StatTile
      square={square}
      label={label}
      value={format(value)}
      unit={unit}
      delta={delta}
      sparkline={sparkline}
    />
  );
}

export const renderSteps = (userId: string, square?: boolean) =>
  renderMetric(userId, "steps", square);
export const renderRestingHr = (userId: string, square?: boolean) =>
  renderMetric(userId, "restingHeartRate", square);
export const renderSleep = (userId: string, square?: boolean) =>
  renderMetric(userId, "sleepSeconds", square);
export const renderBodyBattery = (userId: string, square?: boolean) =>
  renderMetric(userId, "bodyBattery", square);
export const renderSpo2 = (userId: string, square?: boolean) =>
  renderMetric(userId, "spo2Average", square);
export const renderRespiration = (userId: string, square?: boolean) =>
  renderMetric(userId, "respirationAvg", square);
export const renderHillScore = (userId: string, square?: boolean) =>
  renderMetric(userId, "hillScore", square);
export const renderEnduranceScore = (userId: string, square?: boolean) =>
  renderMetric(userId, "enduranceScore", square);
// Tabla pública de Garmin, VO2 max de carrera, hombres — dada por Franco, no viene de
// `maxmet` (que solo trae `maxMetCategory` sin decodificar, docs/garmin-api.md). Constante
// nombrada y exportada a propósito: cuando haga falta la tabla femenina se agrega
// VO2_MAX_RUNNING_ZONES_FEMALE al lado + un selector, sin tocar el resto del widget — no
// hay campo de sexo en `users` todavía, así que hoy siempre usa esta
// (docs/specs/app-dashboard-garmin-style-widgets.md).
export const VO2_MAX_RUNNING_ZONES_MALE: ZoneGaugeZone[] = [
  { upTo: 41.7, color: "var(--zone1)" },
  { upTo: 45.4, color: "var(--zone2)" },
  { upTo: 51.1, color: "var(--zone3)" },
  { upTo: 55.4, color: "var(--zone4)" },
  { upTo: 65, color: "var(--zone5)" },
];

const VO2_MAX_RUNNING_LEVELS = [
  { upTo: 41.7, label: "Deficient" },
  { upTo: 45.4, label: "Acceptable" },
  { upTo: 51.1, label: "Good" },
  { upTo: 55.4, label: "Excellent" },
  { upTo: Infinity, label: "Superior" },
];

function vo2MaxRunningLevel(value: number): string {
  return VO2_MAX_RUNNING_LEVELS.find((level) => value <= level.upTo)?.label ?? "Superior";
}

export async function renderVo2MaxRunning(userId: string, square = true): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  const value = today?.vo2MaxRunning;
  if (value == null) return null;

  return (
    <TileShell label="VO2 Max Running" square={square}>
      <ZoneGaugeChart
        value={value}
        min={25}
        max={65}
        zones={VO2_MAX_RUNNING_ZONES_MALE}
        label={vo2MaxRunningLevel(value)}
      />
    </TileShell>
  );
}

export const renderVo2MaxCycling = (userId: string, square?: boolean) =>
  renderMetric(userId, "vo2MaxCycling", square);
export const renderAltitudeAcclimation = (userId: string, square?: boolean) =>
  renderMetric(userId, "altitudeAcclimationMeters", square);
export const renderWeight = (userId: string, square?: boolean) =>
  renderMetric(userId, "weight", square);
export const renderBmi = (userId: string, square?: boolean) =>
  renderMetric(userId, "bmi", square);
