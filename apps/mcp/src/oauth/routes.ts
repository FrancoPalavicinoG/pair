import { Hono } from "hono";
import { z } from "zod";
import { OAuthError } from "@pair/core";
import { env } from "../env";
import {
  getClient,
  registerClient,
  buildConsentRedirect,
  exchangeAuthorizationCode,
  exchangeRefreshToken,
} from "./provider";

export const oauthRoutes = new Hono();

function toOAuthStatus(status: number): 400 | 401 | 500 {
  if (status === 401) return 401;
  if (status === 500) return 500;
  return 400;
}

// RFC 8414.
oauthRoutes.get("/.well-known/oauth-authorization-server", (c) => {
  const issuer = env.OAUTH_ISSUER_URL;
  return c.json({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    registration_endpoint: `${issuer}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
  });
});

const registerSchema = z.object({
  redirect_uris: z.array(z.string().url()).min(1),
  client_name: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
});

// RFC 7591 (Dynamic Client Registration).
oauthRoutes.post("/register", async (c) => {
  const parsed = registerSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: "invalid_client_metadata", error_description: parsed.error.message }, 400);
  }

  const metadata = await registerClient(parsed.data);
  return c.json({ ...metadata, client_id_issued_at: Math.floor(Date.now() / 1000) }, 201);
});

const authorizeQuerySchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.literal("S256"),
  scope: z.string().optional(),
  state: z.string().optional(),
});

oauthRoutes.get("/authorize", async (c) => {
  const query = Object.fromEntries(new URL(c.req.url).searchParams);
  const parsed = authorizeQuerySchema.safeParse(query);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", error_description: parsed.error.message }, 400);
  }
  const { client_id, redirect_uri, code_challenge, scope, state } = parsed.data;

  const client = await getClient(client_id);
  if (!client) {
    return c.json({ error: "invalid_client", error_description: "Unknown client_id" }, 400);
  }
  if (!client.redirect_uris.includes(redirect_uri)) {
    return c.json(
      { error: "invalid_request", error_description: "redirect_uri not registered for this client" },
      400,
    );
  }

  const redirectUrl = buildConsentRedirect({
    clientId: client_id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    scopes: scope ? scope.split(" ") : [],
    state,
  });
  return c.redirect(redirectUrl, 302);
});

const tokenBodySchema = z.discriminatedUnion("grant_type", [
  z.object({
    grant_type: z.literal("authorization_code"),
    code: z.string().min(1),
    redirect_uri: z.string().url(),
    client_id: z.string().min(1),
    code_verifier: z.string().min(1),
  }),
  z.object({
    grant_type: z.literal("refresh_token"),
    refresh_token: z.string().min(1),
    client_id: z.string().min(1),
  }),
]);

oauthRoutes.post("/token", async (c) => {
  const body = await c.req.parseBody();
  const parsed = tokenBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", error_description: parsed.error.message }, 400);
  }

  try {
    const tokens =
      parsed.data.grant_type === "authorization_code"
        ? await exchangeAuthorizationCode({
            clientId: parsed.data.client_id,
            code: parsed.data.code,
            codeVerifier: parsed.data.code_verifier,
            redirectUri: parsed.data.redirect_uri,
          })
        : await exchangeRefreshToken({
            clientId: parsed.data.client_id,
            refreshToken: parsed.data.refresh_token,
          });
    return c.json(tokens);
  } catch (err) {
    if (err instanceof OAuthError) {
      return c.json(
        { error: err.oauthErrorCode, error_description: err.message },
        toOAuthStatus(err.status),
      );
    }
    throw err;
  }
});
