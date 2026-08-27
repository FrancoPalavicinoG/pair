import {
  findUserByEmail,
  findCredentialsByUserId,
  upsertCredentials,
  findMostRecentActivityId,
  insertActivity,
  findMostRecentMetricsDate,
  upsertDailyMetrics,
  seal,
  open,
  updateSyncStatus,
  type GarminCredentialStatus,
} from "@pair/db";
import {
  createGarminClient,
  createRateLimiter,
  GarminApiError,
  NotFoundError,
  activityDetailSchema,
} from "@pair/core";

const GARMIN_AUTH_URL = process.env.GARMIN_AUTH_URL ?? "http://localhost:8000";
const GARMIN_AUTH_SHARED_SECRET = process.env.GARMIN_AUTH_SHARED_SECRET ?? "";

const MAX_ACTIVITY_PAGES = 25;
const ACTIVITY_PAGE_SIZE = 20;
const FIRST_SYNC_DAILY_METRICS_DAYS = 30;

export type Oauth1 = {
  oauth_token: string;
  oauth_token_secret: string;
  mfa_token: string | null;
  domain: string | null;
};
export type Oauth2 = {
  scope: string;
  jti: string;
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  refresh_token_expires_in: number;
  refresh_token_expires_at: number;
};
export type StoredCredentials = { oauth1: Oauth1; oauth2: Oauth2 };
export type LoginResult =
  { status: "success"; creds: StoredCredentials } | { status: "mfa_required"; sessionId: string };

async function garminAuthPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${GARMIN_AUTH_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shared-Secret": GARMIN_AUTH_SHARED_SECRET },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new GarminApiError(`garmin-auth ${path} failed: ${data.code ?? res.status}`, {
      status: res.status,
      cause: data,
    });
  }
  return data as T;
}

export async function performLogin(email: string, password: string): Promise<LoginResult> {
  const result = await garminAuthPost<
    | { status: "success"; oauth1: Oauth1; oauth2: Oauth2 }
    | { status: "mfa_required"; session_id: string }
  >("/login", { email, password });

  if (result.status === "success") {
    return { status: "success", creds: { oauth1: result.oauth1, oauth2: result.oauth2 } };
  }
  return { status: "mfa_required", sessionId: result.session_id };
}

export async function performMfa(sessionId: string, code: string): Promise<StoredCredentials> {
  const result = await garminAuthPost<{ oauth1: Oauth1; oauth2: Oauth2 }>("/mfa", {
    session_id: sessionId,
    code,
  });
  return { oauth1: result.oauth1, oauth2: result.oauth2 };
}

export async function getExistingUser(email: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new NotFoundError(`No user with email ${email}. Sign up first via apps/web.`);
  }
  return user;
}

export async function loadCredentials(userId: string): Promise<StoredCredentials | null> {
  const row = await findCredentialsByUserId(userId);
  if (!row) return null;
  const plaintext = open(row.credentialsCiphertext, userId);
  return JSON.parse(plaintext) as StoredCredentials;
}

export async function saveCredentials(
  userId: string,
  creds: StoredCredentials,
  status: GarminCredentialStatus,
): Promise<void> {
  const ciphertext = seal(JSON.stringify(creds), userId);
  await upsertCredentials(userId, ciphertext, status);
}

export function createSyncClient(
  userId: string,
  initialCreds: StoredCredentials,
  onCredsUpdated: (creds: StoredCredentials) => void,
) {
  let creds = initialCreds;
  const rateLimiter = createRateLimiter(500);
  return createGarminClient({
    fetch,
    rateLimiter,
    getAccessToken: async () => creds.oauth2.access_token,
    refreshAccessToken: async () => {
      const { oauth2 } = await garminAuthPost<{ oauth2: Oauth2 }>("/refresh", {
        oauth1: creds.oauth1,
      });
      creds = { oauth1: creds.oauth1, oauth2 };
      await saveCredentials(userId, creds, "active");
      onCredsUpdated(creds);
      return oauth2.access_token;
    },
  });
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export async function syncActivities(
  userId: string,
  client: ReturnType<typeof createGarminClient>,
): Promise<number> {
  const mostRecentId = await findMostRecentActivityId(userId);
  const knownIds = new Set(mostRecentId !== null ? [mostRecentId] : []);

  let inserted = 0;
  for (let page = 0; page < MAX_ACTIVITY_PAGES; page++) {
    const start = page * ACTIVITY_PAGE_SIZE;
    const batch = await client.connectapi<Record<string, unknown>[]>(
      `/activitylist-service/activities/search/activities?start=${start}&limit=${ACTIVITY_PAGE_SIZE}`,
    );
    if (batch.length === 0) break;

    let hitKnown = false;
    for (const raw of batch) {
      const garminActivityId = raw.activityId as number;
      if (knownIds.has(garminActivityId)) {
        hitKnown = true;
        break;
      }
      await insertActivity({
        userId,
        garminActivityId,
        name: (raw.activityName as string) ?? null,
        sportType: ((raw.activityType as Record<string, unknown>)?.typeKey as string) ?? null,
        startTimeUtc: new Date(raw.startTimeGMT as string),
        startTimeLocal: new Date((raw.startTimeLocal as string).replace(" ", "T")),
        durationSeconds: (raw.duration as number) ?? null,
        distanceMeters: (raw.distance as number) ?? null,
        calories: (raw.calories as number) ?? null,
        raw,
      });
      inserted++;
    }
    if (hitKnown || batch.length < ACTIVITY_PAGE_SIZE) break;
  }
  return inserted;
}

// Devuelve `value` como objeto indexable si lo es, si no `undefined` — para
// encadenar acceso a campos anidados sin `any` (CLAUDE.md raiz: any prohibido).
function obj(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

// Igual que `client.connectapi`, pero no tira: un dia sin dato para este
// endpoint (reloj no compatible, cuenta sin ese dato ese dia) no debe cortar
// el resto de los campos de `syncDailyMetrics`.
async function tryFetch<T>(
  client: ReturnType<typeof createGarminClient>,
  path: string,
): Promise<T | null> {
  try {
    return await client.connectapi<T>(path);
  } catch {
    return null;
  }
}

export async function syncDailyMetrics(
  userId: string,
  displayName: string,
  client: ReturnType<typeof createGarminClient>,
): Promise<number> {
  const mostRecentDate = await findMostRecentMetricsDate(userId);
  const today = new Date();
  // El dia de hoy se re-sincroniza siempre (sus datos siguen cambiando
  // hasta la noche), aunque ya tenga una fila guardada.
  const afterMostRecent = mostRecentDate
    ? addDays(new Date(mostRecentDate), 1)
    : addDays(today, -FIRST_SYNC_DAILY_METRICS_DAYS);
  const start = afterMostRecent > today ? today : afterMostRecent;

  let count = 0;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const summary = await client.connectapi<Record<string, unknown>>(
      `/usersummary-service/usersummary/daily/${displayName}?calendarDate=${dateStr}`,
    );

    const hrv = await tryFetch<Record<string, unknown>>(client, `/hrv-service/hrv/${dateStr}`);
    const hrvSummary = obj(hrv?.hrvSummary);

    const sleep = await tryFetch<Record<string, unknown>>(
      client,
      `/sleep-service/sleep/dailySleepData?date=${dateStr}`,
    );
    const sleepDto = obj(sleep?.dailySleepDTO);
    const sleepOverall = obj(obj(sleepDto?.sleepScores)?.overall);

    // Agregador: trae estado de entreno + ACWR + aclimatacion + VO2max + foco
    // de carga en una sola llamada (docs/garmin-api.md).
    const trainingStatusAggregate = await tryFetch<Record<string, unknown>>(
      client,
      `/mobile-gateway/usersummary/trainingstatus/latest/${dateStr}`,
    );
    const trainingStatusData = obj(
      obj(obj(trainingStatusAggregate?.mostRecentTrainingStatus)?.payload)?.latestTrainingStatusData,
    );
    const firstDeviceTrainingStatus = trainingStatusData
      ? obj(Object.values(trainingStatusData)[0])
      : undefined;
    const acuteTrainingLoad = obj(firstDeviceTrainingStatus?.acuteTrainingLoadDTO);
    const acclimation = obj(
      obj(trainingStatusAggregate?.mostRecentHeatAltitudeAcclimation)?.payload,
    );
    const vo2MaxPayload = obj(obj(trainingStatusAggregate?.mostRecentVO2Max)?.payload);
    const vo2Generic = obj(vo2MaxPayload?.generic);
    const vo2Cycling = obj(vo2MaxPayload?.cycling);
    const loadBalanceMap = obj(
      obj(obj(trainingStatusAggregate?.mostRecentTrainingLoadBalance)?.payload)
        ?.metricsTrainingLoadBalanceDTOMap,
    );
    const firstDeviceLoadBalance = loadBalanceMap ? obj(Object.values(loadBalanceMap)[0]) : undefined;

    const readinessList = await tryFetch<Record<string, unknown>[]>(
      client,
      `/metrics-service/metrics/trainingreadiness/${dateStr}`,
    );
    const morningReadiness = readinessList?.find(
      (entry) => entry.inputContext === "AFTER_WAKEUP_RESET",
    );

    const hillScoreData = await tryFetch<Record<string, unknown>>(
      client,
      `/metrics-service/metrics/hillscore?calendarDate=${dateStr}`,
    );
    const enduranceScoreData = await tryFetch<Record<string, unknown>>(
      client,
      `/metrics-service/metrics/endurancescore?calendarDate=${dateStr}`,
    );

    const weightData = await tryFetch<Record<string, unknown>>(
      client,
      `/weight-service/weight/dayview/${dateStr}`,
    );
    const weightTotalAverage = obj(weightData?.totalAverage);

    await upsertDailyMetrics({
      userId,
      date: dateStr,
      restingHeartRate: (summary.restingHeartRate as number) ?? null,
      steps: (summary.totalSteps as number) ?? null,
      sleepSeconds: (summary.sleepingSeconds as number) ?? null,
      bodyBattery: (summary.bodyBatteryMostRecentValue as number) ?? null,
      stressAverage: (summary.averageStressLevel as number) ?? null,
      spo2Average: (summary.averageSpo2 as number) ?? null,
      respirationAvg: (summary.avgWakingRespirationValue as number) ?? null,
      hrvStatus: (hrvSummary?.status as string) ?? null,
      hrvWeeklyAvg: (hrvSummary?.weeklyAvg as number) ?? null,
      hrvLastNightAvg: (hrvSummary?.lastNightAvg as number) ?? null,
      sleepScore: (sleepOverall?.value as number) ?? null,
      deepSleepSeconds: (sleepDto?.deepSleepSeconds as number) ?? null,
      lightSleepSeconds: (sleepDto?.lightSleepSeconds as number) ?? null,
      remSleepSeconds: (sleepDto?.remSleepSeconds as number) ?? null,
      awakeSleepSeconds: (sleepDto?.awakeSleepSeconds as number) ?? null,
      trainingStatus: (firstDeviceTrainingStatus?.trainingStatus as number) ?? null,
      trainingStatusPhrase: (firstDeviceTrainingStatus?.trainingStatusFeedbackPhrase as string) ?? null,
      acuteLoad: (acuteTrainingLoad?.dailyTrainingLoadAcute as number) ?? null,
      chronicLoad: (acuteTrainingLoad?.dailyTrainingLoadChronic as number) ?? null,
      acwr: (acuteTrainingLoad?.dailyAcuteChronicWorkloadRatio as number) ?? null,
      heatAcclimationPercent: (acclimation?.heatAcclimationPercentage as number) ?? null,
      altitudeAcclimationMeters: (acclimation?.altitudeAcclimation as number) ?? null,
      vo2MaxRunning: (vo2Generic?.vo2MaxValue as number) ?? null,
      vo2MaxCycling: (vo2Cycling?.vo2MaxValue as number) ?? null,
      loadBalanceFeedback: (firstDeviceLoadBalance?.trainingBalanceFeedbackPhrase as string) ?? null,
      readinessScore: (morningReadiness?.score as number) ?? null,
      readinessLevel: (morningReadiness?.level as string) ?? null,
      hillScore: (hillScoreData?.overallScore as number) ?? null,
      enduranceScore: (enduranceScoreData?.overallScore as number) ?? null,
      weight: (weightTotalAverage?.weight as number) ?? null,
      bmi: (weightTotalAverage?.bmi as number) ?? null,
      raw: {
        usersummary: summary,
        hrv,
        sleep,
        trainingStatus: trainingStatusAggregate,
        readiness: readinessList,
        hillScore: hillScoreData,
        enduranceScore: enduranceScoreData,
        weight: weightData,
      },
    });
    count++;
  }
  return count;
}

export async function getDisplayName(client: ReturnType<typeof createGarminClient>) {
  const profile = await client.connectapi<{ displayName: string }>(
    "/userprofile-service/socialProfile",
  );
  return profile.displayName;
}

export async function fetchActivityDetail(userId: string, garminActivityId: number) {
  const creds = await loadCredentials(userId);
  if (!creds) throw new NotFoundError("No Garmin credentials found for user");
  const client = createSyncClient(userId, creds, () => {});
  const raw = await client.connectapi(`/activity-service/activity/${garminActivityId}`);
  const parsed = activityDetailSchema.parse(raw);
  return parsed.summaryDTO;
}

export async function runFullSync(userId: string): Promise<void> {
  try {
    const creds = await loadCredentials(userId);
    if (!creds) throw new NotFoundError("No Garmin credentials found for user");
    const client = createSyncClient(userId, creds, () => {});
    const displayName = await getDisplayName(client);
    await syncActivities(userId, client);
    await syncDailyMetrics(userId, displayName, client);
    await updateSyncStatus(userId, { lastSyncedAt: new Date(), syncInProgress: false });
  } catch (err) {
    if (err instanceof GarminApiError) {
      await updateSyncStatus(userId, { syncInProgress: false, status: "expired" });
    } else {
      await updateSyncStatus(userId, { syncInProgress: false });
      throw err;
    }
  }
}
