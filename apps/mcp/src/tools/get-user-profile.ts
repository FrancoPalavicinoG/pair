import type { McpServer } from "@modelcontextprotocol/server";
import { findUserProfile, findSportZones, type SportZoneRow } from "@pair/db";
import { requireScope } from "./require-scope";

// Mapeo confirmado contra cuenta real (docs/garmin-api.md, docs/specs/garmin-user-profile.md).
// Cualquier otro valor de `sport` se muestra tal cual lo manda Garmin, sin adivinar un label.
const SPORT_LABELS: Record<string, string> = {
  DEFAULT: "Running/general",
  CYCLING: "Ciclismo",
};

function line(label: string, value: unknown, unit?: string): string | null {
  if (value == null) return null;
  return unit ? `${label}: ${value}${unit}` : `${label}: ${value}`;
}

// Rango de una zona: [piso, piso de la siguiente - 1]; la última zona no tiene techo.
function zoneRange(floor: number | null, nextFloor: number | null): string {
  return nextFloor != null ? `${floor}-${nextFloor - 1}` : `${floor}+`;
}

function formatZone(zone: SportZoneRow): string {
  const label = SPORT_LABELS[zone.sport] ?? zone.sport;
  const floors = [zone.hrZone1Floor, zone.hrZone2Floor, zone.hrZone3Floor, zone.hrZone4Floor, zone.hrZone5Floor];
  const hasHr = floors.some((f) => f != null);

  const lines = [
    hasHr
      ? `  Zonas de FC (bpm): ${floors
          .map((f, i) => (f == null ? null : `Z${i + 1} ${zoneRange(f, floors[i + 1] ?? null)}`))
          .filter((l): l is string => l !== null)
          .join(", ")}`
      : null,
    line("  FC en reposo", zone.restingHeartRate, " bpm"),
    line("  FC máxima", zone.maxHeartRate, " bpm"),
    line("  FC de umbral de lactato", zone.lactateThresholdHeartRate, " bpm"),
    line("  FTP", zone.ftpWatts, " W"),
  ].filter((l): l is string => l !== null);

  if (lines.length === 0) return `${label}: sin zonas configuradas en Garmin.`;
  return `${label}:\n${lines.join("\n")}`;
}

export function registerGetUserProfileTool(server: McpServer): void {
  server.registerTool(
    "get_user_profile",
    {
      title: "Perfil físico y zonas de esfuerzo",
      description:
        "Altura, peso, días de entreno preferidos, y zonas de FC / FTP por deporte, sincronizados desde Garmin. Usar esto para resolver targets relativos (ej. 'zona 3 de FC', '85% de tu FTP') a valores absolutos antes de armar un PairWorkout — nunca preguntarle el número al usuario si esta tool ya lo tiene.",
    },
    async (ctx) => {
      const auth = requireScope(ctx, "profile:read");
      if ("content" in auth) return auth;

      const [profile, zones] = await Promise.all([
        findUserProfile(auth.userId),
        findSportZones(auth.userId),
      ]);

      if (!profile) {
        return {
          content: [
            {
              type: "text",
              text: "Tu perfil todavía no se sincronizó. Esperá al próximo sync o reconectá Garmin desde /connections.",
            },
          ],
        };
      }

      const profileLines = [
        line("Altura", profile.heightCm, " cm"),
        line("Peso", profile.weightGrams != null ? profile.weightGrams / 1000 : null, " kg"),
        line("Días de entreno disponibles", profile.availableTrainingDays?.join(", ") ?? null),
        line("Días preferidos para la sesión larga", profile.preferredLongTrainingDays?.join(", ") ?? null),
      ].filter((l): l is string => l !== null);

      const zonesText =
        zones.length === 0
          ? "No tenés zonas de esfuerzo configuradas en Garmin para ningún deporte."
          : zones.map(formatZone).join("\n\n");

      return {
        content: [{ type: "text", text: `${profileLines.join("\n")}\n\n${zonesText}` }],
      };
    },
  );
}
