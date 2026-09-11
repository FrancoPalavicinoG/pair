import type { McpServer } from "@modelcontextprotocol/server";
import { findWeeklySummary, type WeeklySportBucket } from "@pair/db";
import { formatDistance, formatDuration, formatLabel } from "@pair/core";
import { requireScope } from "./require-scope";

function percentChange(thisWeek: number, lastWeek: number): string {
  if (lastWeek === 0) return "Primera semana con datos";
  const changePercent = ((thisWeek - lastWeek) / lastWeek) * 100;
  const sign = changePercent >= 0 ? "+" : "−";
  return `${sign}${Math.abs(changePercent).toFixed(0)}% vs semana pasada`;
}

function formatActivityCount(count: number): string {
  return count === 1 ? "1 actividad" : `${count} actividades`;
}

function formatSportLine(sportType: string, thisWeek: WeeklySportBucket, lastWeek: WeeklySportBucket): string {
  // Un deporte que se dejó de hacer esta semana (thisWeek en 0) igual es una
  // señal útil ("dejaste de hacer X"), pero "0 m, 0 actividades (−100%)" lee
  // confuso — se dice directo que esta semana no hubo, con el dato de la
  // semana pasada como referencia.
  if (thisWeek.activityCount === 0) {
    return `${formatLabel(sportType)}: sin actividad esta semana (la semana pasada: ${formatDistance(lastWeek.distanceMeters)}, ${formatActivityCount(lastWeek.activityCount)})`;
  }
  return `${formatLabel(sportType)}: ${formatDistance(thisWeek.distanceMeters)}, ${formatActivityCount(thisWeek.activityCount)} (${percentChange(thisWeek.distanceMeters, lastWeek.distanceMeters)})`;
}

export function registerGetTrainingLoadTool(server: McpServer): void {
  server.registerTool(
    "get_training_load",
    {
      title: "Carga de entrenamiento semanal",
      description:
        "Volumen de entrenamiento de esta semana comparado con la semana pasada, por deporte, más la duración total. Usala para responder cuánto entrenó el usuario y si viene subiendo o bajando el volumen — no para el detalle de una actividad puntual (usá list_activities/get_activity para eso).",
      inputSchema: {},
    },
    async (_args, ctx) => {
      const auth = requireScope(ctx, "activities:read");
      if ("content" in auth) return auth;

      const summary = await findWeeklySummary(auth.userId);
      const sportLines = Object.entries(summary.bySport)
        .filter(([, weeks]) => weeks.thisWeek.distanceMeters > 0 || weeks.lastWeek.distanceMeters > 0)
        .sort(([, a], [, b]) => b.thisWeek.distanceMeters - a.thisWeek.distanceMeters)
        .map(([sportType, weeks]) => formatSportLine(sportType, weeks.thisWeek, weeks.lastWeek));

      if (sportLines.length === 0) {
        return { content: [{ type: "text", text: "No hay actividades esta semana ni la anterior." }] };
      }

      const durationLine = `Duración total esta semana: ${formatDuration(summary.totalDurationSeconds.thisWeek)} (${percentChange(summary.totalDurationSeconds.thisWeek, summary.totalDurationSeconds.lastWeek)})`;

      return { content: [{ type: "text", text: `${sportLines.join("\n")}\n\n${durationLine}` }] };
    },
  );
}
