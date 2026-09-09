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
  const target = current.find((w) => w.key === key);
  if (!target) return;

  const flipped = current.map((w) => (w.key === key ? { ...w, visible: !w.visible } : w));
  await upsertDashboardLayout(session.userId, flipped);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/widgets");
}

export async function showAllWidgets(): Promise<void> {
  const session = await requireSession();
  const current = await getEffectiveLayout(session.userId);
  const allVisible = current.map((w) => ({ ...w, visible: true }));
  await upsertDashboardLayout(session.userId, allVisible);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/widgets");
}
