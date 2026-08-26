import { eq } from "drizzle-orm";
import { db } from "../client";
import { dashboardLayouts, type DashboardWidgets } from "../schema/dashboard-layouts";

export type DashboardLayoutRow = typeof dashboardLayouts.$inferSelect;

export async function findDashboardLayout(userId: string): Promise<DashboardLayoutRow | null> {
  const [row] = await db.select().from(dashboardLayouts).where(eq(dashboardLayouts.userId, userId));
  return row ?? null;
}

export async function upsertDashboardLayout(
  userId: string,
  widgets: DashboardWidgets,
): Promise<void> {
  await db
    .insert(dashboardLayouts)
    .values({ userId, widgets })
    .onConflictDoUpdate({
      target: [dashboardLayouts.userId],
      set: { widgets, updatedAt: new Date() },
    });
}
