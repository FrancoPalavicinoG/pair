import { pgTable, timestamp, text, jsonb } from "drizzle-orm/pg-core";

// Blob crudo de lo que devuelve DCR (RFC 7591): redirect_uris, grant_types,
// client_name, token_endpoint_auth_method, client_secret si aplica. No se
// normaliza columna por columna porque nada de esto se filtra ni se ordena.
export type OAuthClientMetadata = {
  client_id: string;
  client_secret?: string;
  client_name?: string;
  redirect_uris: string[];
  grant_types: string[];
  token_endpoint_auth_method: string;
  [key: string]: unknown;
};

export const oauthClients = pgTable("oauth_clients", {
  // El client_id es el identificador que el cliente MCP presenta en cada
  // request, no un uuid interno.
  clientId: text("client_id").primaryKey(),
  metadata: jsonb("metadata").notNull().$type<OAuthClientMetadata>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
