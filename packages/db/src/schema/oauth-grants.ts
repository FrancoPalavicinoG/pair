import { pgTable, timestamp, uuid, text } from "drizzle-orm/pg-core";
import { users } from "./users";
import { oauthClients } from "./oauth-clients";

// Una fila es un authorization code o un refresh token activo. PKCE en este
// proyecto es siempre S256 (lo único que MCP permite), no hace falta columna
// de método.
export type OAuthGrantType = "authorization_code" | "refresh_token";

export const oauthGrants = pgTable("oauth_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clientId: text("client_id")
    .notNull()
    .references(() => oauthClients.clientId, { onDelete: "cascade" }),
  type: text("type").notNull().$type<OAuthGrantType>(),
  // SHA-256 hex del code o del refresh token. Nunca se guarda el valor en claro.
  tokenHash: text("token_hash").notNull().unique(),
  scopes: text("scopes").array().notNull(),
  // Solo en filas "authorization_code".
  codeChallenge: text("code_challenge"),
  redirectUri: text("redirect_uri"),
  // Un authorization code es de un solo uso.
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
