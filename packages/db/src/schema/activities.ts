import { pgTable, timestamp, uuid, text, bigint, real, jsonb, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    garminActivityId: bigint("garmin_activity_id", { mode: "number" }).notNull(),
    name: text("name"),
    sportType: text("sport_type"),
    /** Instante real (de startTimeGMT). Para queries y orden. */
    startTimeUtc: timestamp("start_time_utc", { withTimezone: true }).notNull(),
    /**
     * Hora local tal como la reporta Garmin, sin convertir. Un entrenamiento
     * de las 6am importa como "6am", no como su UTC (ver packages/db/CLAUDE.md).
     */
    startTimeLocal: timestamp("start_time_local", { withTimezone: false }).notNull(),
    durationSeconds: real("duration_seconds"),
    distanceMeters: real("distance_meters"),
    calories: real("calories"),
    /** Payload crudo de Garmin. La API no es oficial: si algo se rompe, esto es la única fuente. */
    raw: jsonb("raw").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.garminActivityId)],
);
