import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { createMcpHonoApp } from "@modelcontextprotocol/hono";
import { OAuthError } from "@pair/core";
import { env } from "./env";
import { oauthRoutes } from "./oauth/routes";
import { verifyAccessToken } from "./oauth/provider";
import { handleMcpRequest } from "./mcp-session";

const PROTECTED_RESOURCE_METADATA_URL = `${env.OAUTH_ISSUER_URL}/.well-known/oauth-protected-resource/mcp`;

const app = createMcpHonoApp();
app.route("/", oauthRoutes);

// Un cliente MCP en el navegador (ej. @modelcontextprotocol/inspector web)
// llama a /mcp desde otro origen (su propio puerto) con headers custom
// (Authorization, Mcp-Session-Id) — dispara preflight. Sin esto, el navegador
// bloquea la respuesta del lado del cliente aunque el server conteste bien
// (se vio como "Request timed out" contra el inspector real, no un error de
// CORS explícito). El recurso ya está protegido por bearer token, no por
// cookies, así que "*" acá no expone nada que el propio token no exponga.
app.use(
  "/mcp",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "Mcp-Session-Id", "mcp-protocol-version"],
    exposeHeaders: ["Mcp-Session-Id", "WWW-Authenticate"],
  }),
);

// El transport es "pass-through": nunca lee el header Authorization ni
// verifica el token por su cuenta. La verificación es nuestra — se le pasa
// el AuthInfo ya resuelto por handleRequest().
app.all("/mcp", async (c) => {
  // RFC 9728 §5.1: un recurso protegido apunta a su propia metadata en el
  // 401, para que un cliente que no hace path-guessing la encuentre igual.
  const unauthorized = (body: Record<string, string>) =>
    c.json(body, 401, {
      "WWW-Authenticate": `Bearer resource_metadata="${PROTECTED_RESOURCE_METADATA_URL}"`,
    });

  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!token) {
    return unauthorized({ error: "invalid_token", error_description: "Missing bearer token" });
  }

  try {
    const authInfo = await verifyAccessToken(token);
    // createMcpHonoApp() instala un middleware que guarda el body JSON
    // parseado en la variable de contexto "parsedBody" (ver
    // @modelcontextprotocol/hono), pero el Hono que devuelve no declara ese
    // Variables — Hono tipa c.get() a `never` sin un generic explícito.
    const getVar = c.get as unknown as (key: string) => unknown;
    return await handleMcpRequest(c.req.raw, { authInfo, parsedBody: getVar("parsedBody") });
  } catch (err) {
    if (err instanceof OAuthError) {
      return unauthorized({ error: err.oauthErrorCode, error_description: err.message });
    }
    throw err;
  }
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`apps/mcp listening on http://localhost:${info.port}`);
});
