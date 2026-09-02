import { z } from "zod";

// Campos confirmados contra una cuenta real (docs/fixtures/activity-detail.anon.json).
// Garmin puede mandar muchos más campos de los que usamos acá.
export const activityDetailSchema = z
  .object({
    summaryDTO: z
      .object({
        distance: z.number().optional(),
        duration: z.number().optional(),
        averageHR: z.number().optional(),
        maxHR: z.number().optional(),
        trainingEffect: z.number().optional(),
      })
      .passthrough(),
  })
  .passthrough();

// Campos confirmados contra una cuenta real (docs/fixtures/sleep-daily.anon.json).
// `sleepLevels` no está documentado por Garmin — el bloque a bloque real de cada fase de
// sueño, no solo movimiento (docs/garmin-api.md).
export const sleepDailyDataSchema = z
  .object({
    dailySleepDTO: z
      .object({
        sleepStartTimestampGMT: z.number(),
        sleepStartTimestampLocal: z.number(),
      })
      .passthrough(),
    sleepLevels: z
      .array(
        z.object({
          startGMT: z.string(),
          endGMT: z.string(),
          activityLevel: z.number(),
        }),
      )
      .optional(),
  })
  .passthrough();
