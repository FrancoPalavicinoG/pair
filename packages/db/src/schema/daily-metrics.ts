import { pgTable, timestamp, uuid, integer, jsonb, date, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

// Una fila por usuario y día; el resto de las métricas vive en raw.
export const dailyMetrics = pgTable(
  "daily_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    restingHeartRate: integer("resting_heart_rate"),
    steps: integer("steps"),
    sleepSeconds: integer("sleep_seconds"),
    bodyBattery: integer("body_battery"),
    stressAverage: integer("stress_average"),
    spo2Average: integer("spo2_average"),
    respirationAvg: integer("respiration_avg"),
    raw: jsonb("raw").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.date)],
);
