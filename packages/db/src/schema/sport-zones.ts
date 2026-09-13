import { pgTable, timestamp, uuid, integer, text, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

// Una fila por usuario + deporte. `sport` es el string que devuelve Garmin
// ("DEFAULT", "CYCLING", ...) tal cual, no un enum cerrado nuestro — no se
// asume que esa sea la lista completa (docs/garmin-api.md, docs/specs/garmin-user-profile.md).
export const sportZones = pgTable(
  "sport_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sport: text("sport").notNull(),
    hrZone1Floor: integer("hr_zone_1_floor"),
    hrZone2Floor: integer("hr_zone_2_floor"),
    hrZone3Floor: integer("hr_zone_3_floor"),
    hrZone4Floor: integer("hr_zone_4_floor"),
    hrZone5Floor: integer("hr_zone_5_floor"),
    restingHeartRate: integer("resting_heart_rate"),
    maxHeartRate: integer("max_heart_rate"),
    lactateThresholdHeartRate: integer("lactate_threshold_heart_rate"),
    ftpWatts: integer("ftp_watts"), // solo tiene sentido para sport="CYCLING", null en el resto
    syncedAt: timestamp("synced_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.userId, table.sport)],
);
