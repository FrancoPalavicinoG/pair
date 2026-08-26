import type { ReactNode } from "react";
import { findDashboardLayout, type DashboardWidgetConfig } from "@pair/db";
import { renderRecentActivities } from "./recent-activities";
import { renderTodayMetrics } from "./today-metrics";
import { renderWeeklySummary } from "./weekly-summary";

export type WidgetKey = "recent_activities" | "today_metrics" | "weekly_summary";

export const WIDGET_REGISTRY: Record<
  WidgetKey,
  { label: string; render: (userId: string) => Promise<ReactNode> }
> = {
  recent_activities: { label: "Recent activities", render: renderRecentActivities },
  today_metrics: { label: "Today", render: renderTodayMetrics },
  weekly_summary: { label: "This week", render: renderWeeklySummary },
};

// Usada por (app)/dashboard/page.tsx y (app)/dashboard/widgets/page.tsx — el mismo cálculo
// de "layout guardado o default" hacía falta en las dos, así que vive acá una sola vez.
export async function getEffectiveLayout(userId: string): Promise<DashboardWidgetConfig[]> {
  const row = await findDashboardLayout(userId);
  if (row) {
    return row.widgets;
  }

  // No hay fila todavía, devolvemos el default: las keys de WIDGET_REGISTRY en su orden de 
  // declaración arriba, cada una como { key, visible: true }.
  return Object.keys(WIDGET_REGISTRY).map((key) => ({ key, visible: true }));
}
