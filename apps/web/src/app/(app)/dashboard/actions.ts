"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireSession } from "@/lib/session";
import { runFullSync } from "@pair/sync";
import {
  updateSyncStatus,
  findCredentialsByUserId,
  upsertDashboardLayout,
  type DashboardWidgets,
} from "@pair/db";
import { NotFoundError } from "@pair/core";
import { getEffectiveLayout, type WidgetKey } from "./_components/widgets/registry";

export async function syncNowAction() {
  const session = await requireSession();
  const creds = await findCredentialsByUserId(session.userId);
  if (!creds) throw new NotFoundError("No Garmin credentials found for user");
  if (creds.syncInProgress) {
    return;
  }

  await updateSyncStatus(session.userId, { syncInProgress: true });
  after(() => runFullSync(session.userId));
  revalidatePath("/dashboard");
}

export async function updateDashboardLayout(widgets: DashboardWidgets): Promise<void> {
  const session = await requireSession();
  await upsertDashboardLayout(session.userId, widgets);
  revalidatePath("/dashboard");
}

export async function toggleWidgetVisibility(key: WidgetKey): Promise<void> {
  const session = await requireSession();
  const current = await getEffectiveLayout(session.userId);
  const flipped = current.map((w) => (w.key === key ? { ...w, visible: !w.visible } : w));
  await upsertDashboardLayout(session.userId, flipped);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/widgets");
}
