import { z } from "zod4";
import type { McpServer } from "@modelcontextprotocol/server";
import { findRecentDailyMetrics, type DailyMetricsRow } from "@pair/db";
import { requireScope } from "./require-scope";

const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;

type Trend = { latest: number; direction: "up" | "down" | "stable"; changePercent: number };

// Compara el primer y el ultimo valor no nulo de la ventana, en orden
// cronologico. stableThreshold evita marcar "tendencia" por ruido de ±1
// unidad — cada metrica tiene su propia escala de ruido normal.
function computeTrend(values: (number | null)[], stableThreshold: number): Trend | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length < 2) return null;

  const first = present[0]!;
  const last = present[present.length - 1]!;
  const changePercent = first === 0 ? 0 : ((last - first) / first) * 100;
  const direction = Math.abs(changePercent) < stableThreshold ? "stable" : changePercent > 0 ? "up" : "down";

  return { latest: last, direction, changePercent };
}

type MetricConfig = {
  key: keyof DailyMetricsRow;
  label: string;
  unit: string;
  stableThreshold: number;
  format: (v: number) => string;
};

const METRICS: MetricConfig[] = [
  { key: "restingHeartRate", label: "FC en reposo", unit: " bpm", stableThreshold: 3, format: (v) => v.toFixed(0) },
  { key: "hrvLastNightAvg", label: "HRV (última noche)", unit: " ms", stableThreshold: 3, format: (v) => v.toFixed(0) },
  { key: "sleepScore", label: "Score de sueño", unit: "", stableThreshold: 5, format: (v) => v.toFixed(0) },
  { key: "readinessScore", label: "Readiness", unit: "", stableThreshold: 5, format: (v) => v.toFixed(0) },
  { key: "acwr", label: "ACWR (agudo/crónico)", unit: "", stableThreshold: 5, format: (v) => v.toFixed(2) },
];

const DIRECTION_LABEL: Record<Trend["direction"], string> = {
  up: "subiendo",
  down: "bajando",
  stable: "estable",
};

function formatMetricLine(config: MetricConfig, rows: DailyMetricsRow[]): string | null {
  const values = rows.map((row) => {
    const raw = row[config.key];
    return typeof raw === "number" ? raw : null;
  });
  const trend = computeTrend(values, config.stableThreshold);
  if (!trend) return null;

  const changeText =
    trend.direction === "stable"
      ? ""
      : ` (${DIRECTION_LABEL[trend.direction]}, ${trend.changePercent >= 0 ? "+" : ""}${trend.changePercent.toFixed(0)}%)`;

  return `${config.label}: ${config.format(trend.latest)}${config.unit}${changeText}`;
}

export function registerGetRecoveryTrendTool(server: McpServer): void {
  server.registerTool(
    "get_recovery_trend",
    {
      title: "Tendencia de recuperación",
      description:
        "Cómo vienen evolucionando FC en reposo, HRV, sueño, readiness y ACWR en los últimos N días — el valor más reciente y si sube, baja o está estable, no solo la foto de un día. Usala para responder 'cómo vengo de recuperación', no para el dato crudo de un solo día (usá get_daily_metrics para eso).",
      inputSchema: {
        days: z
          .number()
          .int()
          .min(2)
          .max(MAX_DAYS)
          .optional()
          .describe(`Ventana de días hacia atrás (default ${DEFAULT_DAYS}, tope ${MAX_DAYS}). Mínimo 2 para poder calcular una tendencia.`),
      },
    },
    async ({ days }, ctx) => {
      const auth = requireScope(ctx, "metrics:read");
      if ("content" in auth) return auth;

      const rows = await findRecentDailyMetrics(auth.userId, days ?? DEFAULT_DAYS);
      const lines = METRICS.map((config) => formatMetricLine(config, rows)).filter(
        (line): line is string => line !== null,
      );

      if (lines.length === 0) {
        return {
          content: [{ type: "text", text: "No hay suficientes datos en esa ventana para calcular una tendencia." }],
        };
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
