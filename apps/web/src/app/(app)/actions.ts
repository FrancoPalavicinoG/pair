"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { destroySession } from "@/lib/session";
import { requireSession } from "@/lib/session";
import { runFullSync } from "@pair/sync";
import { updateSyncStatus, findCredentialsByUserId } from "@pair/db";
import { NotFoundError } from "@pair/core";

export async function logout() {
  await destroySession();
  redirect("/login");
}

// Dispara un sync en segundo plano (after) y marca syncInProgress de una para que el
// sidebar (SyncStatusPoller) empiece a pollear de inmediato. Vive acá, no en dashboard/,
// porque el CTA que lo dispara vive en el sidebar y es visible desde cualquier ruta.
export async function syncNowAction() {
  const session = await requireSession();
  const creds = await findCredentialsByUserId(session.userId);
  if (!creds) throw new NotFoundError("No Garmin credentials found for user");
  if (creds.syncInProgress) {
    return;
  }

  await updateSyncStatus(session.userId, { syncInProgress: true });
  after(() => runFullSync(session.userId));
  revalidatePath("/", "layout");
}
