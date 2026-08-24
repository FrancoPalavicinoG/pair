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
