import { eq } from "drizzle-orm";
import { db } from "../client";
import {
  garminCredentials,
  type EncryptedPayload,
  type GarminCredentialStatus,
} from "../schema/garmin-credentials";

export async function findCredentialsByUserId(userId: string) {
  const [row] = await db
    .select()
    .from(garminCredentials)
    .where(eq(garminCredentials.userId, userId));
  return row ?? null;
}

export async function updateSyncStatus(
  userId: string,
  fields: Partial<{ lastSyncedAt: Date; syncInProgress: boolean; status: GarminCredentialStatus }>,
): Promise<void> {
  await db
    .update(garminCredentials)
    .set(fields)
    .where(eq(garminCredentials.userId, userId));
}

export async function upsertCredentials(
  userId: string,
  ciphertext: EncryptedPayload,
  status: GarminCredentialStatus,
) {
  const existing = await findCredentialsByUserId(userId);
  if (existing) {
    await db
      .update(garminCredentials)
      .set({ credentialsCiphertext: ciphertext, status, lastRefreshedAt: new Date() })
      .where(eq(garminCredentials.userId, userId));
  } else {
    await db
      .insert(garminCredentials)
      .values({ userId, credentialsCiphertext: ciphertext, status });
  }
}
