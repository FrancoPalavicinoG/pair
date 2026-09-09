import { randomUUID } from "node:crypto";
import { McpServer, WebStandardStreamableHTTPServerTransport, type AuthInfo } from "@modelcontextprotocol/server";
import { registerGetStartedTool } from "./tools/get-started";

// createMcpHandler() (la opción simple) sirve el protocolo 2025-11-25 en modo
// "stateless": cada request es una instancia nueva, sin sesión. Eso responde
// 405 a GET/DELETE por diseño (documentado en el propio paquete) — y un
// cliente real (@modelcontextprotocol/inspector, probablemente Claude
// Desktop/Code también) abre ese GET para el canal de push del servidor y no
// tolera el rechazo. Por eso esto arma la sesión a mano con
// WebStandardStreamableHTTPServerTransport en vez de usar createMcpHandler.
//
// Limitación conocida, aceptable para este alcance: no hay expiración de
// sesiones abandonadas (un cliente que se cae sin mandar DELETE deja la
// entrada en el Map). Para el volumen de este proyecto no es un problema
// hoy; si se vuelve uno, se agrega un TTL cuando haga falta, no antes.
const sessions = new Map<string, WebStandardStreamableHTTPServerTransport>();

function buildServer(): McpServer {
  const server = new McpServer(
    { name: "pair", version: "0.0.0" },
    { instructions: "Antes de usar cualquier otra tool de PAIR, llamá a get_started." },
  );
  registerGetStartedTool(server);
  return server;
}

async function createSessionTransport(): Promise<WebStandardStreamableHTTPServerTransport> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    // Ninguna tool de esta fase manda progreso intermedio — respuesta JSON
    // directa en vez de SSE evita la demora de streaming que se vio contra
    // un cliente real (23-60s por request, sin motivo aparente en el server).
    enableJsonResponse: true,
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, transport);
    },
    onsessionclosed: (sessionId) => {
      sessions.delete(sessionId);
    },
  });
  await buildServer().connect(transport);
  return transport;
}

export async function handleMcpRequest(
  req: Request,
  options: { authInfo: AuthInfo; parsedBody?: unknown },
): Promise<Response> {
  const sessionId = req.headers.get("mcp-session-id");
  const existing = sessionId ? sessions.get(sessionId) : undefined;
  const transport = existing ?? (await createSessionTransport());
  return transport.handleRequest(req, options);
}
