import { randomBytes } from "node:crypto";
import { OAuthError } from "@pair/core";
import {
  hashToken,
  findOAuthClient,
  insertOAuthClient,
  findGrantByTokenHash,
  consumeGrant,
  deleteGrant,
  createRefreshTokenGrant,
  createAccessToken,
  findAccessTokenByHash,
  type OAuthClientMetadata,
} from "@pair/db";
import { env } from "../env";
import { verifyPkce } from "./pkce";
import type { AuthInfo, AuthorizeParams, TokenResponse } from "./types";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function getClient(clientId: string): Promise<OAuthClientMetadata | null> {
  const client = await findOAuthClient(clientId);
  return client?.metadata ?? null;
}

type RegisterClientInput = {
  redirect_uris: string[];
  client_name?: string;
  grant_types?: string[];
  token_endpoint_auth_method?: string;
};

// DCR (RFC 7591). Clientes MCP son publicos por defecto (PKCE, sin secret).
export async function registerClient(input: RegisterClientInput): Promise<OAuthClientMetadata> {
  const clientId = generateToken();
  const tokenEndpointAuthMethod = input.token_endpoint_auth_method ?? "none";

  const metadata: OAuthClientMetadata = {
    client_id: clientId,
    client_name: input.client_name,
    redirect_uris: input.redirect_uris,
    grant_types: input.grant_types ?? ["authorization_code", "refresh_token"],
    token_endpoint_auth_method: tokenEndpointAuthMethod,
    ...(tokenEndpointAuthMethod !== "none" ? { client_secret: generateToken() } : {}),
  };

  const created = await insertOAuthClient(clientId, metadata);
  if (!created) {
    throw new OAuthError("server_error", "Failed to register client", { status: 500 });
  }
  return created.metadata;
}

// authorize() no crea ningun grant: solo valida y arma el redirect a la
// pantalla de consentimiento de apps/web. El grant lo crea esa pantalla
// cuando el usuario aprueba (Plan 2).
export function buildConsentRedirect(params: AuthorizeParams): string {
  const url = new URL("/oauth/consent", env.PAIR_WEB_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("scope", params.scopes.join(" "));
  if (params.state) url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeAuthorizationCode(params: {
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const grant = await findGrantByTokenHash(hashToken(params.code));
  if (!grant || grant.type !== "authorization_code") {
    throw new OAuthError("invalid_grant", "Unknown authorization code");
  }
  if (grant.consumedAt) {
    throw new OAuthError("invalid_grant", "Authorization code already used");
  }
  if (grant.expiresAt < new Date()) {
    throw new OAuthError("invalid_grant", "Authorization code expired");
  }
  if (grant.clientId !== params.clientId) {
    throw new OAuthError("invalid_grant", "Client mismatch");
  }
  if (grant.redirectUri !== params.redirectUri) {
    throw new OAuthError("invalid_grant", "redirect_uri mismatch");
  }
  if (!grant.codeChallenge || !verifyPkce(params.codeVerifier, grant.codeChallenge)) {
    throw new OAuthError("invalid_grant", "PKCE verification failed");
  }

  await consumeGrant(grant.id);
  return issueTokens({ userId: grant.userId, clientId: grant.clientId, scopes: grant.scopes });
}

export async function exchangeRefreshToken(params: {
  clientId: string;
  refreshToken: string;
}): Promise<TokenResponse> {
  const grant = await findGrantByTokenHash(hashToken(params.refreshToken));
  if (!grant || grant.type !== "refresh_token") {
    throw new OAuthError("invalid_grant", "Unknown refresh token");
  }
  if (grant.expiresAt < new Date()) {
    throw new OAuthError("invalid_grant", "Refresh token expired");
  }
  if (grant.clientId !== params.clientId) {
    throw new OAuthError("invalid_grant", "Client mismatch");
  }

  // Rotacion: el refresh token usado se invalida, se emite uno nuevo.
  await deleteGrant(grant.id);
  return issueTokens({ userId: grant.userId, clientId: grant.clientId, scopes: grant.scopes });
}

async function issueTokens(params: {
  userId: string;
  clientId: string;
  scopes: string[];
}): Promise<TokenResponse> {
  const refreshToken = generateToken();
  const newGrant = await createRefreshTokenGrant({
    userId: params.userId,
    clientId: params.clientId,
    tokenHash: hashToken(refreshToken),
    scopes: params.scopes,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  if (!newGrant) {
    throw new OAuthError("server_error", "Failed to create refresh grant", { status: 500 });
  }

  const accessToken = generateToken();
  const createdToken = await createAccessToken({
    grantId: newGrant.id,
    userId: params.userId,
    clientId: params.clientId,
    tokenHash: hashToken(accessToken),
    scopes: params.scopes,
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000),
  });
  if (!createdToken) {
    throw new OAuthError("server_error", "Failed to create access token", { status: 500 });
  }

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: params.scopes.join(" "),
  };
}

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  const row = await findAccessTokenByHash(hashToken(token));
  if (!row) {
    throw new OAuthError("invalid_token", "Unknown access token", { status: 401 });
  }
  if (row.expiresAt < new Date()) {
    throw new OAuthError("invalid_token", "Access token expired", { status: 401 });
  }
  return {
    token,
    clientId: row.clientId,
    scopes: row.scopes,
    expiresAt: Math.floor(row.expiresAt.getTime() / 1000),
    extra: { userId: row.userId },
  };
}
