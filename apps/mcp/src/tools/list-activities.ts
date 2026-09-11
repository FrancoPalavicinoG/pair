import { z } from "zod4";
import type { McpServer } from "@modelcontextprotocol/server";
import { findActivities, type Activity } from "@pair/db";
import {
  ACTIVITY_CATEGORIES,
  formatDistance,
  formatDuration,
  getActivityCategory,
  getSpeedDisplay,
  getSportTypesForCategory,
} from "@pair/core";
import { requireScope } from "./require-scope";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function formatActivityLine(activity: Activity): string {
  const category = getActivityCategory(activity.sportType);
  const name = activity.name ?? category;
  const when = activity.startTimeLocal.toISOString().replace("T", " ").slice(0, 16);
  const distance = activity.distanceMeters != null ? formatDistance(activity.distanceMeters) : null;
  const duration = activity.durationSeconds != null ? formatDuration(activity.durationSeconds) : null;
  const speed = getSpeedDisplay(category, activity.averageSpeedMps);

  const parts = [when, name, distance, duration, speed !== "–" ? speed : null].filter(Boolean);
  return `${parts.join(" — ")} (id: ${activity.garminActivityId})`;
}

export function registerListActivitiesTool(server: McpServer): void {
  server.registerTool(
    "list_activities",
    {
      title: "Listar actividades",
      description:
        "Actividades del usuario en un rango de fechas, resumidas (una línea por actividad, con su id para pedir el detalle después con get_activity). Usala para responder preguntas sobre qué entrenó, cuándo, y con qué volumen — no para el detalle completo de una actividad puntual.",
      inputSchema: {
        range: z
          .enum(["this_week", "this_month", "all"])
          .optional()
          .describe("Rango de fechas. Default: esta semana."),
        category: z.enum(ACTIVITY_CATEGORIES).optional().describe("Filtrar por categoría de actividad."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .optional()
          .describe(`Máximo de actividades a devolver (default ${DEFAULT_LIMIT}, tope ${MAX_LIMIT}).`),
      },
    },
    async ({ range, category, limit }, ctx) => {
      const auth = requireScope(ctx, "activities:read");
      if ("content" in auth) return auth;

      const activities = await findActivities(auth.userId, {
        limit: limit ?? DEFAULT_LIMIT,
        sportTypes: category ? getSportTypesForCategory(category) : undefined,
        range: range ?? "this_week",
      });

      if (activities.length === 0) {
        return { content: [{ type: "text", text: "No hay actividades en ese rango." }] };
      }

      const lines = activities.map(formatActivityLine);
      return {
        content: [{ type: "text", text: `${activities.length} actividad(es):\n\n${lines.join("\n")}` }],
      };
    },
  );
}
