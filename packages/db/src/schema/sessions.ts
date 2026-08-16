import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

// El id de la fila es el token de sesion (lo que va en la cookie).
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
