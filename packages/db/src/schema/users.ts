import { pgTable, timestamp, uuid, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Zona IANA del usuario; se captura del browser en cada login/signup.
  timezone: text("timezone").notNull().default("America/Santiago"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
