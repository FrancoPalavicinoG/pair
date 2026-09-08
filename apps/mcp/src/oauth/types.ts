import type { OAuthClientMetadata } from "@pair/db";

export type { OAuthClientMetadata };

// Mismo shape que documenta el SDK de MCP para AuthInfo (ver
// ts.sdk.modelcontextprotocol.io/v2/serving/authorization.html) — no se
// importa del SDK porque el paquete todavía no está instalado en este ítem
// (llega con las tools, próximo ítem del roadmap), pero el shape calza para
// cuando eso pase.
export type AuthInfo = {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
  extra: { userId: string };
};

export type AuthorizeParams = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: string[];
  state?: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};
