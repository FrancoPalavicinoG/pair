import type { OAuthClientMetadata } from "@pair/db";
import type { AuthInfo } from "@modelcontextprotocol/server";

export type { OAuthClientMetadata, AuthInfo };

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
