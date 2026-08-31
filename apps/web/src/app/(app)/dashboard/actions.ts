"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { upsertDashboardLayout, type DashboardWidgets } from "@pair/db";
import { getEffectiveLayout, type WidgetKey } from "./_components/widgets/registry";

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
