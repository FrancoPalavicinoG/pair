import type { CallToolResult, ServerContext } from "@modelcontextprotocol/server";
import type { PairOAuthScope } from "@pair/core";
import { OAuthError } from "@pair/core";

// Nota para quien agregue una tool nueva con inputSchema: registerTool exige
// Zod v4 (necesita `~standard.jsonSchema`, que v3 no implementa — confirmado
// contra el .d.ts del paquete instalado). El resto de apps/mcp (rutas OAuth,
// ya probadas end-to-end) sigue en zod v3 sin tocarse — import { z } from
// "zod4" (alias de package.json) solo en los archivos de tools con input.

type ScopeCheckResult = { userId: string; scopes: string[] };

// Resuelve userId/scopes del AuthInfo (mismo patron que get-started.ts) y
// verifica el scope pedido. Nunca lanza para un permiso faltante — devuelve
// un CallToolResult con isError para que Claude lo lea y actue en
// consecuencia (regla de apps/mcp/CLAUDE.md: nunca stack traces). Un userId
// no resoluble es otro caso: bug real del servidor, no de permisos, sigue
// tirando OAuthError.
export function requireScope(ctx: ServerContext, scope: PairOAuthScope): ScopeCheckResult | CallToolResult {
  const authInfo = ctx.http?.authInfo;
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string") {
    throw new OAuthError("server_error", "No se pudo resolver el usuario del token", { status: 500 });
  }

  const scopes = authInfo?.scopes ?? [];
  if (!scopes.includes(scope)) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Esta acción necesita un permiso que esta conexión no tiene ("${scope}"). Reconectá desde /connections con ese permiso habilitado.`,
        },
      ],
    };
  }

  return { userId, scopes };
}
