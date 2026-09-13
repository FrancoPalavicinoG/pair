import { pgTable, timestamp, uuid, integer, text } from "drizzle-orm/pg-core";
import { users } from "./users";

// Una fila por usuario. Sync desde Garmin (userprofile-service/user-settings,
// docs/garmin-api.md) — sin edición manual todavía (garmin-user-profile.md, "No entra").
export const userProfile = pgTable("user_profile", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  heightCm: integer("height_cm"),
  weightGrams: integer("weight_grams"), // gramos, confirmado — no kg
  availableTrainingDays: text("available_training_days").array(),
  preferredLongTrainingDays: text("preferred_long_training_days").array(),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});
