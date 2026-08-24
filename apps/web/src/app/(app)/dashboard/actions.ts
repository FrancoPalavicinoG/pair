"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { destroySession, requireSession } from "@/lib/session";
import { runFullSync } from "@pair/sync";
import { updateSyncStatus, findCredentialsByUserId } from "@pair/db";
import { NotFoundError } from "@pair/core";

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function syncNowAction() {
  const session = await requireSession();
  const creds = await findCredentialsByUserId(session.userId);
  if (!creds) throw new NotFoundError("No Garmin credentials found for user");
  if (creds.syncInProgress) {
    // Si ya hay un sync en progreso, no hacemos nada más.
    return;
  }

  await updateSyncStatus(session.userId, { syncInProgress: true });
  after(() => runFullSync(session.userId));
  revalidatePath("/dashboard");
}
