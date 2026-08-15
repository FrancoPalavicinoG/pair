import { pgTable, timestamp, uuid, text } from "drizzle-orm/pg-core";

/**
 * Mínimo para poder tener un user_id al que colgar el resto de las tablas.
 * Auth propia de PAIR (magic link / passkeys) llega en P2 — esto no es eso.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
