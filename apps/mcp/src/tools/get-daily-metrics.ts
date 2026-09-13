import { z } from "zod4";
import type { McpServer } from "@modelcontextprotocol/server";
import { findRecentDailyMetrics, type DailyMetricsRow } from "@pair/db";
import { formatDuration } from "@pair/core";
import { requireScope } from "./require-scope";

const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;

function line(label: string, value: unknown, unit?: string): string | null {
  if (value == null) return null;
  return unit ? `${label}: ${value}${unit}` : `${label}: ${value}`;
}

function formatDay(row: DailyMetricsRow): string {
  const lines = [
    row.steps != null ? line("Pasos", row.steps.toLocaleString()) : null,
    line("FC en reposo", row.restingHeartRate, " bpm"),
    row.sleepSeconds != null ? line("Sueño", formatDuration(row.sleepSeconds)) : null,
    line("Score de sueño", row.sleepScore),
    line("Body battery", row.bodyBattery, "/100"),
    line("Estrés promedio", row.stressAverage),
    line("SpO2 promedio", row.spo2Average, "%"),
    line("Respiración promedio", row.respirationAvg, " brpm"),
    line("HRV status", row.hrvStatus),
    line("HRV promedio semanal", row.hrvWeeklyAvg),
    line("HRV última noche", row.hrvLastNightAvg),
    line("Estado de entreno", row.trainingStatusPhrase ?? row.trainingStatus),
    line("Carga aguda", row.acuteLoad),
    line("Carga crónica", row.chronicLoad),
    line("ACWR (agudo/crónico)", row.acwr),
    line("Aclimatación al calor", row.heatAcclimationPercent, "%"),
    line("Aclimatación a altitud", row.altitudeAcclimationMeters, " m"),
    line("Readiness score", row.readinessScore),
    line("Readiness level", row.readinessLevel),
    line("VO2 max running", row.vo2MaxRunning),
    line("VO2 max cycling", row.vo2MaxCycling),
    line("Hill score", row.hillScore),
    line("Endurance score", row.enduranceScore),
    line("Balance de carga", row.loadBalanceFeedback),
  ].filter((l): l is string => l !== null);

  if (lines.length === 0) return `${row.date}: sin datos ese día.`;
  return `${row.date}:\n${lines.map((l) => `  ${l}`).join("\n")}`;
}

export function registerGetDailyMetricsTool(server: McpServer): void {
  server.registerTool(
    "get_daily_metrics",
    {
      title: "Métricas diarias",
      description:
        "Métricas diarias de Garmin del usuario (sueño, FC en reposo, pasos, body battery, HRV, estado de entreno, readiness, etc.) para los últimos N días. Un campo ausente en un día significa que Garmin no lo reportó ese día, no que sea cero.",
      inputSchema: {
        days: z
          .number()
          .int()
          .min(1)
          .max(MAX_DAYS)
          .optional()
          .describe(`Cuántos días hacia atrás (default ${DEFAULT_DAYS}, tope ${MAX_DAYS}).`),
      },
    },
    async ({ days }, ctx) => {
      const auth = requireScope(ctx, "metrics:read");
      if ("content" in auth) return auth;

      const rows = await findRecentDailyMetrics(auth.userId, days ?? DEFAULT_DAYS);
      if (rows.length === 0) {
        return { content: [{ type: "text", text: "No hay métricas diarias en ese rango." }] };
      }

      return { content: [{ type: "text", text: rows.map(formatDay).join("\n\n") }] };
    },
  );
}
