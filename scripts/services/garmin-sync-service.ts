import {
  findUserByEmail,
  createUser,
  findCredentialsByUserId,
  upsertCredentials,
  findMostRecentActivityId,
  insertActivity,
  findMostRecentMetricsDate,
  upsertDailyMetrics,
  seal,
  open,
  type GarminCredentialStatus,
} from "@pair/db";
import { createGarminClient, createRateLimiter, GarminApiError } from "@pair/core";

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

export async function getOrCreateUser(email: string) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  return createUser(email);
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
    await upsertDailyMetrics({
      userId,
      date: dateStr,
      restingHeartRate: (summary.restingHeartRate as number) ?? null,
      steps: (summary.totalSteps as number) ?? null,
      sleepSeconds: (summary.sleepingSeconds as number) ?? null,
      bodyBattery: (summary.bodyBatteryMostRecentValue as number) ?? null,
      raw: summary,
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
