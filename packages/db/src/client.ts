import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { ConfigError } from "@pair/core";
import * as schema from "./schema/index";

/**
 * Único punto del repo que instancia una conexión a Postgres.
 * Nadie más debería llamar a `postgres()` directamente.
 */
function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new ConfigError("DATABASE_URL is not set");
  }
  const client = postgres(databaseUrl);
  return drizzle(client, { schema });
}

export const db = createDb();
export type Database = ReturnType<typeof createDb>;
