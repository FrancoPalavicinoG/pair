import { pgTable, timestamp, uuid, text } from "drizzle-orm/pg-core";
import { users } from "./users";
import { oauthClients } from "./oauth-clients";
import { oauthGrants } from "./oauth-grants";

export const oauthTokens = pgTable("oauth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  grantId: uuid("grant_id")
    .notNull()
    .references(() => oauthGrants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clientId: text("client_id")
    .notNull()
    .references(() => oauthClients.clientId, { onDelete: "cascade" }),
  // SHA-256 hex del access token. Nunca se guarda el valor en claro.
  tokenHash: text("token_hash").notNull().unique(),
  scopes: text("scopes").array().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
