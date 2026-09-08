import { randomBytes } from "node:crypto";
import { z } from "zod";
import { findOAuthClient, createAuthorizationCodeGrant, hashToken, type OAuthClientMetadata } from "@pair/db";
import { OAuthError } from "@pair/core";

// Las 4 scopes de apps/mcp/CLAUDE.md, en lenguaje llano — sin jerga de OAuth
// (regla dura de apps/web/CLAUDE.md). Object.keys(SCOPE_LABELS) es la lista
// canonica de scopes validas para este archivo.
export const SCOPE_LABELS: Record<string, string> = {
  "activities:read": "Ver tus actividades y su detalle",
  "metrics:read": "Ver tus métricas diarias y su detalle",
  "workouts:read": "Ver tus entrenamientos creados y agendados",
  "workouts:write": "Crear, agendar y borrar entrenamientos (siempre con tu confirmación en cada uno)",
};

// Solo este servicio crea authorization codes (al aprobar el consentimiento),
// asi que la TTL vive aca, no en apps/mcp — mismo criterio que
// SESSION_DURATION_DAYS en lib/session.ts.
const AUTHORIZATION_CODE_TTL_MS = 60 * 1000;

const consentRequestSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(1),
  scope: z.string().optional(),
  state: z.string().optional(),
});

export type ConsentRequest = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: string[];
  state?: string;
};

type RawConsentInput = {
  client_id?: string;
  redirect_uri?: string;
  code_challenge?: string;
  scope?: string;
  state?: string;
};

// Revalida siempre contra la DB — nunca confiar en que un query param o un
// input hidden que vuelve del cliente sigue siendo lo que /authorize aprobó.
export async function validateConsentRequest(
  raw: RawConsentInput,
): Promise<{ client: OAuthClientMetadata; request: ConsentRequest }> {
  const parsed = consentRequestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new OAuthError("invalid_request", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const client = await findOAuthClient(parsed.data.client_id);
  if (!client) {
    throw new OAuthError("invalid_client", "Unknown client_id");
  }
  if (!client.metadata.redirect_uris.includes(parsed.data.redirect_uri)) {
    throw new OAuthError("invalid_request", "redirect_uri not registered for this client");
  }

  const requestedScopes = parsed.data.scope ? parsed.data.scope.split(" ") : [];
  const scopes = requestedScopes.filter((scope) => scope in SCOPE_LABELS);
  if (scopes.length !== requestedScopes.length) {
    throw new OAuthError("invalid_scope", "Unknown scope requested");
  }

  return {
    client: client.metadata,
    request: {
      clientId: parsed.data.client_id,
      redirectUri: parsed.data.redirect_uri,
      codeChallenge: parsed.data.code_challenge,
      scopes,
      state: parsed.data.state,
    },
  };
}

export async function approveConsent(userId: string, request: ConsentRequest): Promise<string> {
  const code = randomBytes(32).toString("base64url");

  await createAuthorizationCodeGrant({
    userId,
    clientId: request.clientId,
    tokenHash: hashToken(code),
    scopes: request.scopes,
    codeChallenge: request.codeChallenge,
    redirectUri: request.redirectUri,
    expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS),
  });

  const url = new URL(request.redirectUri);
  url.searchParams.set("code", code);
  if (request.state) url.searchParams.set("state", request.state);
  return url.toString();
}

export function denyConsent(request: ConsentRequest): string {
  const url = new URL(request.redirectUri);
  url.searchParams.set("error", "access_denied");
  if (request.state) url.searchParams.set("state", request.state);
  return url.toString();
}
