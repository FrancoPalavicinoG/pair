import { pgTable, timestamp, uuid, integer, real, text, jsonb, date, unique } from "drizzle-orm/pg-core";
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
    // HRV (hrv-service/hrv/{fecha})
    hrvStatus: text("hrv_status"),
    hrvWeeklyAvg: integer("hrv_weekly_avg"),
    hrvLastNightAvg: integer("hrv_last_night_avg"),
    // Sueño (sleep-service/sleep/dailySleepData)
    sleepScore: integer("sleep_score"),
    deepSleepSeconds: integer("deep_sleep_seconds"),
    lightSleepSeconds: integer("light_sleep_seconds"),
    remSleepSeconds: integer("rem_sleep_seconds"),
    awakeSleepSeconds: integer("awake_sleep_seconds"),
    // Estado de entreno, ACWR, aclimatación, VO2max, foco de carga
    // (todo del mismo agregador mobile-gateway/usersummary/trainingstatus/latest/{fecha})
    trainingStatus: integer("training_status"),
    trainingStatusPhrase: text("training_status_phrase"),
    acuteLoad: integer("acute_load"),
    chronicLoad: integer("chronic_load"),
    acwr: real("acwr"),
    heatAcclimationPercent: integer("heat_acclimation_percent"),
    altitudeAcclimationMeters: integer("altitude_acclimation_meters"),
    vo2MaxRunning: integer("vo2_max_running"),
    vo2MaxCycling: integer("vo2_max_cycling"),
    loadBalanceFeedback: text("load_balance_feedback"),
    // Readiness (metrics-service/metrics/trainingreadiness/{fecha})
    readinessScore: integer("readiness_score"),
    readinessLevel: text("readiness_level"),
    // Scores (hillscore / endurancescore)
    hillScore: integer("hill_score"),
    enduranceScore: integer("endurance_score"),
    // Peso (weight-service/weight/dayview/{fecha}). Unidad sin confirmar: la
    // cuenta de prueba no tiene peso cargado, Garmin suele reportar en
    // gramos en otros endpoints — no se asume "Kg" hasta ver un dato real.
    weight: real("weight"),
    bmi: real("bmi"),
    raw: jsonb("raw").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.date)],
);
