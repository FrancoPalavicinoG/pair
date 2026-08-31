import type { ReactNode } from "react";
import { findDashboardLayout, findWeeklySummary, type DashboardWidgetConfig } from "@pair/db";
import { formatSportType } from "@/lib/format";
import { renderSteps, renderRestingHr, renderSleep, renderBodyBattery } from "./daily-metrics";
import { renderWeeklyHours } from "./weekly-hours";
import { renderWeeklyDistance } from "./weekly-distance";
import { renderRecentActivity } from "./recent-activity";

export type FixedWidgetKey =
  | "steps"
  | "resting_hr"
  | "sleep"
  | "body_battery"
  | "weekly_hours"
  | "recent_activity";

// Key compuesta para el widget de distancia por deporte: "weekly_distance:running".
export type WidgetKey = FixedWidgetKey | `weekly_distance:${string}`;

export type WidgetEntry = {
  key: WidgetKey;
  label: string;
  render: (userId: string) => Promise<ReactNode>;
};

const FIXED_WIDGET_REGISTRY: Record<FixedWidgetKey, Omit<WidgetEntry, "key">> = {
  steps: { label: "Steps", render: renderSteps },
  resting_hr: { label: "Resting HR", render: renderRestingHr },
  sleep: { label: "Sleep", render: renderSleep },
  body_battery: { label: "Body battery", render: renderBodyBattery },
  weekly_hours: { label: "Training hours", render: renderWeeklyHours },
  recent_activity: { label: "Most recent activity", render: renderRecentActivity },
};

// Los widgets "weekly_distance:<sport>" no son una key fija: se calculan a partir de los
// deportes que aparecen de verdad en la semana/semana pasada del usuario (docs/specs/app-dashboard-widgets-v2.md).
export async function getWidgetEntries(userId: string): Promise<WidgetEntry[]> {
  const fixed: WidgetEntry[] = (Object.keys(FIXED_WIDGET_REGISTRY) as FixedWidgetKey[]).map((key) => ({
    key,
    ...FIXED_WIDGET_REGISTRY[key],
  }));

  const { bySport } = await findWeeklySummary(userId);
  const sportEntries: WidgetEntry[] = Object.keys(bySport)
    .sort()
    .map((sportType) => ({
      key: `weekly_distance:${sportType}` as const,
      label: formatSportType(sportType),
      render: (uid: string) => renderWeeklyDistance(uid, sportType),
    }));

  return [...fixed, ...sportEntries];
}

// Usada por (app)/dashboard/page.tsx y (app)/dashboard/widgets/page.tsx — el mismo cálculo
// de "layout guardado + default" hacía falta en las dos, así que vive acá una sola vez.
//
// Mezcla el layout guardado (si existe) con el set actual de widgets: una key guardada que
// ya no existe (ej. las keys v1 "today_metrics"/"weekly_summary"/"recent_activities") se
// ignora, y cualquier widget que el usuario todavía no tiene guardado (porque nunca tuvo
// layout, o porque es nuevo desde su último guardado) se agrega al final como visible.
export async function getEffectiveLayout(userId: string): Promise<DashboardWidgetConfig[]> {
  const [entries, row] = await Promise.all([getWidgetEntries(userId), findDashboardLayout(userId)]);
  const stored = row?.widgets ?? [];

  const knownKeys = new Set<string>(entries.map((entry) => entry.key));
  const storedKnown = stored.filter((w) => knownKeys.has(w.key));

  const storedKeys = new Set(storedKnown.map((w) => w.key));
  const missing: DashboardWidgetConfig[] = entries
    .filter((entry) => !storedKeys.has(entry.key))
    .map((entry) => ({ key: entry.key, visible: true }));

  return [...storedKnown, ...missing];
}
