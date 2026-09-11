import { z } from "zod4";
import type { McpServer } from "@modelcontextprotocol/server";
import { findActivityByGarminId } from "@pair/db";
import { formatDistance, formatDuration, getActivityCategory, getSpeedDisplay } from "@pair/core";
import { requireScope } from "./require-scope";

export function registerGetActivityTool(server: McpServer): void {
  server.registerTool(
    "get_activity",
    {
      title: "Detalle de una actividad",
      description:
        "Detalle completo de una actividad puntual del usuario, a partir del id que devolvió list_activities. Usala cuando necesites más que el resumen de una línea (por ejemplo, las calorías).",
      inputSchema: {
        garminActivityId: z.number().int().describe("El id que devolvió list_activities."),
      },
    },
    async ({ garminActivityId }, ctx) => {
      const auth = requireScope(ctx, "activities:read");
      if ("content" in auth) return auth;

      const activity = await findActivityByGarminId(auth.userId, garminActivityId);
      if (!activity) {
        return {
          isError: true,
          content: [{ type: "text", text: "No encontré una actividad con ese id en tu cuenta." }],
        };
      }

      const category = getActivityCategory(activity.sportType);
      const when = activity.startTimeLocal.toISOString().replace("T", " ").slice(0, 16);
      const lines = [
        `Nombre: ${activity.name ?? category}`,
        `Categoría: ${category}`,
        `Fecha y hora local: ${when}`,
        activity.distanceMeters != null ? `Distancia: ${formatDistance(activity.distanceMeters)}` : null,
        activity.durationSeconds != null ? `Duración: ${formatDuration(activity.durationSeconds)}` : null,
        getSpeedDisplay(category, activity.averageSpeedMps) !== "–"
          ? `Ritmo/velocidad: ${getSpeedDisplay(category, activity.averageSpeedMps)}`
          : null,
        activity.calories != null ? `Calorías: ${activity.calories.toFixed(0)}` : null,
      ].filter((line): line is string => line !== null);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
