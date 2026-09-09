import type { ReactNode } from "react";
import { findDashboardLayout, findWeeklySummary, type DashboardWidgetConfig } from "@pair/db";
import { formatLabel } from "@/lib/format";
import { renderBodyBattery, renderEnduranceScore, renderVo2MaxRunning } from "./daily-metrics";
import { renderWeeklyHours } from "./weekly-hours";
import { renderWeeklyDistance } from "./weekly-distance";
import { renderRecentActivity } from "./recent-activity";
import { renderHrv } from "./hrv";
import { renderTrainingStatus } from "./training-status";
import { renderTrainingLoad } from "./training-load";
import { renderSleepPhases } from "./sleep-phases";
import { renderReadiness } from "./readiness";

// Catálogo curado para el MVP (docs/specs/app-dashboard-widgets-v2.md, nota de cierre
// Fase B): el resto de los widgets de Fase B (steps, resting_hr, sleep, spo2, respiration,
// hill_score, vo2_max_cycling, altitude_acclimation, weight, bmi, stress, heat_acclimation)
// no se borró, solo se sacó de acá — su código sigue intacto en daily-metrics.tsx,
// stress.tsx y heat-acclimation.tsx para reactivarlo en una próxima iteración.
export type FixedWidgetKey =
  | "body_battery"
  | "weekly_hours"
  | "recent_activity"
  | "endurance_score"
  | "vo2_max_running"
  | "hrv"
  | "training_status"
  | "training_load"
  | "sleep_phases"
  | "readiness";

// Key compuesta para el widget de distancia por deporte: "weekly_distance:running".
export type WidgetKey = FixedWidgetKey | `weekly_distance:${string}`;

// Tope temporal mientras no existe paginación (docs/specs/app-dashboard-widgets-v2.md):
// evita que la grilla del dashboard necesite scroll interno. `getEffectiveLayout` lo
// aplica en la lectura (no reescribe lo guardado), `toggleWidgetVisibility` lo respeta
// al togglear, y `/dashboard/widgets` lo muestra como aviso.
export const MAX_VISIBLE_WIDGETS = 15;

export type WidgetEntry = {
  key: WidgetKey;
  label: string;
  render: (userId: string) => Promise<ReactNode>;
};

const FIXED_WIDGET_REGISTRY: Record<FixedWidgetKey, Omit<WidgetEntry, "key">> = {
  body_battery: { label: "Body battery", render: renderBodyBattery },
  weekly_hours: { label: "Training hours", render: renderWeeklyHours },
  recent_activity: { label: "Most recent activity", render: renderRecentActivity },
  endurance_score: { label: "Endurance score", render: renderEnduranceScore },
  vo2_max_running: { label: "VO2 Max Running", render: renderVo2MaxRunning },
  hrv: { label: "HRV", render: renderHrv },
  training_status: { label: "Training status", render: renderTrainingStatus },
  training_load: { label: "Training load", render: renderTrainingLoad },
  sleep_phases: { label: "Sleep phases", render: renderSleepPhases },
  readiness: { label: "Readiness", render: renderReadiness },
};

// Los widgets "weekly_distance:<sport>" no son una key fija: se calculan a partir de los
// deportes que aparecen de verdad en la semana/semana pasada del usuario (docs/specs/app-dashboard-widgets-v2.md).
//
// Curación MVP (misma nota que FixedWidgetKey más arriba): mientras no exista el diseño real
// de /dashboard/metrics/[key], solo estos deportes generan widget, aunque el usuario haya
// entrenado otros esa semana. Ampliar la curación es agregar acá, no un cambio estructural.
const MVP_SPORT_WIDGETS = new Set(["running", "hiit"]);

export async function getWidgetEntries(userId: string): Promise<WidgetEntry[]> {
  const fixed: WidgetEntry[] = (Object.keys(FIXED_WIDGET_REGISTRY) as FixedWidgetKey[]).map((key) => ({
    key,
    ...FIXED_WIDGET_REGISTRY[key],
  }));

  const { bySport } = await findWeeklySummary(userId);
  const sportEntries: WidgetEntry[] = Object.keys(bySport)
    .filter((sportType) => MVP_SPORT_WIDGETS.has(sportType))
    .sort()
    .map((sportType) => ({
      key: `weekly_distance:${sportType}` as const,
      label: formatLabel(sportType),
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
//
// Después de mezclar, aplica el tope de MAX_VISIBLE_WIDGETS: entre los marcados visible,
// los primeros según el orden del array se quedan así, el resto se corrige a no-visible
// en lo que se devuelve (no se reescribe lo guardado en DB) — corrige también cuentas
// viejas que ya tenían más de 15 antes de que existiera este tope.
export async function getEffectiveLayout(userId: string): Promise<DashboardWidgetConfig[]> {
  const [entries, row] = await Promise.all([getWidgetEntries(userId), findDashboardLayout(userId)]);
  const stored = row?.widgets ?? [];

  const knownKeys = new Set<string>(entries.map((entry) => entry.key));
  const storedKnown = stored.filter((w) => knownKeys.has(w.key));

  const storedKeys = new Set(storedKnown.map((w) => w.key));
  const missing: DashboardWidgetConfig[] = entries
    .filter((entry) => !storedKeys.has(entry.key))
    .map((entry) => ({ key: entry.key, visible: true }));

  const merged = [...storedKnown, ...missing];

  let visibleCount = 0;
  return merged.map((w) => {
    if (!w.visible) return w;
    visibleCount += 1;
    return visibleCount > MAX_VISIBLE_WIDGETS ? { ...w, visible: false } : w;
  });
}
