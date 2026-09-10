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

// Campos confirmados contra una cuenta real (docs/fixtures/training-readiness.anon.json,
// docs/garmin-api.md). Garmin recalcula el readiness varias veces al dia — esto es UNA
// entrada de la lista que devuelve el endpoint, no la respuesta completa; quien la usa
// se queda con la de mayor `timestampLocal` (mismo criterio que packages/sync).
export const trainingReadinessEntrySchema = z
  .object({
    timestampLocal: z.string(),
    score: z.number().optional(),
    level: z.string().optional(),
    feedbackShort: z.string().optional(),
    feedbackLong: z.string().optional(),
    sleepScoreFactorFeedback: z.string().optional(),
    sleepHistoryFactorFeedback: z.string().optional(),
    hrvFactorFeedback: z.string().optional(),
    acwrFactorFeedback: z.string().optional(),
    recoveryTimeFactorFeedback: z.string().optional(),
    stressHistoryFactorFeedback: z.string().optional(),
  })
  .passthrough();

export const trainingReadinessListSchema = z.array(trainingReadinessEntrySchema);

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
