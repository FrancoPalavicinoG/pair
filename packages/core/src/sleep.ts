import { parseGarminUtcTimestamp } from "./date";
import { sleepDailyDataSchema } from "./garmin/schemas";

export type SleepStage = "deep" | "light" | "rem" | "awake";

export type SleepStageSegment = {
  stage: SleepStage;
  startLocal: string;
  endLocal: string;
};

// activityLevel de sleepLevels -> fase. Verificado contra una cuenta real: sumar la
// duración de cada valor da match exacto con deepSleepSeconds/lightSleepSeconds/
// remSleepSeconds/awakeSleepSeconds de dailySleepDTO (docs/garmin-api.md).
const ACTIVITY_LEVEL_TO_STAGE: Record<number, SleepStage> = {
  0: "deep",
  1: "light",
  2: "rem",
  3: "awake",
};

// sleepLevels -> segmentos ya en hora local, en el orden cronológico real de la noche.
// sleepStartTimestampLocal es la hora local empaquetada como si fuera UTC (mismo patrón
// que el bug de timestamps de actividades, docs/garmin-api.md) — el offset real contra
// sleepStartTimestampGMT se calcula una vez y se aplica a cada segmento.
export function parseSleepStages(raw: unknown): SleepStageSegment[] | null {
  const parsed = sleepDailyDataSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.sleepLevels?.length) return null;

  const { dailySleepDTO, sleepLevels } = parsed.data;
  const localOffsetMs = dailySleepDTO.sleepStartTimestampGMT - dailySleepDTO.sleepStartTimestampLocal;

  const segments: SleepStageSegment[] = [];
  for (const level of sleepLevels) {
    const stage = ACTIVITY_LEVEL_TO_STAGE[level.activityLevel];
    if (!stage) continue; // activityLevel no confirmado, se descarta en vez de asumir

    segments.push({
      stage,
      startLocal: new Date(parseGarminUtcTimestamp(level.startGMT).getTime() - localOffsetMs).toISOString(),
      endLocal: new Date(parseGarminUtcTimestamp(level.endGMT).getTime() - localOffsetMs).toISOString(),
    });
  }

  return segments.length > 0 ? segments : null;
}
