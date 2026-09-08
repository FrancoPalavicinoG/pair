import { eq } from "drizzle-orm";
import { db } from "../client";
import { oauthClients, type OAuthClientMetadata } from "../schema/oauth-clients";
import { oauthGrants, type OAuthGrantType } from "../schema/oauth-grants";
import { oauthTokens } from "../schema/oauth-tokens";

export async function findOAuthClient(clientId: string) {
  const [client] = await db.select().from(oauthClients).where(eq(oauthClients.clientId, clientId));
  return client ?? null;
}

export async function insertOAuthClient(clientId: string, metadata: OAuthClientMetadata) {
  const [created] = await db.insert(oauthClients).values({ clientId, metadata }).returning();
  return created ?? null;
}

type CreateAuthorizationCodeGrant = {
  userId: string;
  clientId: string;
  tokenHash: string;
  scopes: string[];
  codeChallenge: string;
  redirectUri: string;
  expiresAt: Date;
};

export async function createAuthorizationCodeGrant(params: CreateAuthorizationCodeGrant) {
  const [created] = await db
    .insert(oauthGrants)
    .values({ ...params, type: "authorization_code" satisfies OAuthGrantType })
    .returning();
  return created ?? null;
}

type CreateRefreshTokenGrant = {
  userId: string;
  clientId: string;
  tokenHash: string;
  scopes: string[];
  expiresAt: Date;
};

export async function createRefreshTokenGrant(params: CreateRefreshTokenGrant) {
  const [created] = await db
    .insert(oauthGrants)
    .values({ ...params, type: "refresh_token" satisfies OAuthGrantType })
    .returning();
  return created ?? null;
}

export async function findGrantByTokenHash(tokenHash: string) {
  const [grant] = await db.select().from(oauthGrants).where(eq(oauthGrants.tokenHash, tokenHash));
  return grant ?? null;
}

export async function consumeGrant(id: string): Promise<void> {
  await db.update(oauthGrants).set({ consumedAt: new Date() }).where(eq(oauthGrants.id, id));
}

export async function deleteGrant(id: string): Promise<void> {
  await db.delete(oauthGrants).where(eq(oauthGrants.id, id));
}

type CreateAccessToken = {
  grantId: string;
  userId: string;
  clientId: string;
  tokenHash: string;
  scopes: string[];
  expiresAt: Date;
};

export async function createAccessToken(params: CreateAccessToken) {
  const [created] = await db.insert(oauthTokens).values(params).returning();
  return created ?? null;
}

export async function findAccessTokenByHash(tokenHash: string) {
  const [token] = await db.select().from(oauthTokens).where(eq(oauthTokens.tokenHash, tokenHash));
  return token ?? null;
}
