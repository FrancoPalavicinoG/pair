import type { McpServer } from "@modelcontextprotocol/server";
import { findCredentialsByUserId, deriveGarminStatus, type GarminStatus } from "@pair/db";
import { OAuthError } from "@pair/core";
import { PAIR_CORE_GUIDANCE, PREVIEW_CONFIRM_GUIDANCE } from "./get-started-content";

function describeGarminStatus(status: GarminStatus): string {
  switch (status.state) {
    case "not_connected":
      return "Garmin no está conectado todavía. Decíselo al usuario antes de intentar cualquier otra tool de datos — no van a funcionar.";
    case "needs_reconnect":
      return "La conexión con Garmin expiró o quedó inválida. Decíselo al usuario: tiene que reconectar desde el dashboard de PAIR.";
    case "syncing":
      return "Garmin está conectado y sincronizando por primera vez — puede tardar unos minutos en tener datos completos.";
    case "synced":
      return status.lastSyncedAt
        ? `Garmin está conectado y sincronizado (última sincronización: ${status.lastSyncedAt.toISOString()}).`
        : "Garmin está conectado y sincronizado.";
  }
}

export function registerGetStartedTool(server: McpServer): void {
  server.registerTool(
    "get_started",
    {
      title: "Empezar con PAIR",
      description:
        "Llamala primero, antes de cualquier otra tool de PAIR. Explica cómo razonar e interactuar con Garmin a través de PAIR, y da el estado real de la conexión Garmin del usuario.",
    },
    async (ctx) => {
      const authInfo = ctx.http?.authInfo;
      const userId = authInfo?.extra?.userId;
      if (typeof userId !== "string") {
        throw new OAuthError("server_error", "get_started: no se pudo resolver el usuario del token", {
          status: 500,
        });
      }

      const scopes = authInfo?.scopes ?? [];
      const credentials = await findCredentialsByUserId(userId);
      const garminStatus = deriveGarminStatus(credentials);

      const sections = [PAIR_CORE_GUIDANCE];
      if (scopes.includes("workouts:write")) {
        sections.push(PREVIEW_CONFIRM_GUIDANCE);
      }
      sections.push(describeGarminStatus(garminStatus));

      return {
        content: [{ type: "text" as const, text: sections.join("\n\n") }],
      };
    },
  );
}
