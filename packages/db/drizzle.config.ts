import { defineConfig } from "drizzle-kit";

// Config de tooling, no código de la app: el loader CJS de drizzle-kit no
// resuelve bien el import cross-package hacia @pair/core acá. Error plano
// a propósito (excepción deliberada a la regla de packages/core/errors.ts).
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run drizzle-kit");
}

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
