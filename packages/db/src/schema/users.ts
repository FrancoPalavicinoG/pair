import { pgTable, timestamp, uuid, text } from "drizzle-orm/pg-core";

// Usuarios: sin auth propia todavía.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
