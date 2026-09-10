import type { ReactNode } from "react";
import { findRecentActivities, findUserTimezone } from "@pair/db";
import { localDateString } from "@pair/core";
import { formatDistance, formatDuration, formatLabel } from "@/lib/format";
import { dayLabel, localDateFromTimestamp } from "@/lib/activity-date";
import { StatTile } from "./stat-tile";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function renderRecentActivity(userId: string, square = true): Promise<ReactNode> {
  const [activity] = await findRecentActivities(userId, 1);
  if (!activity) return null;

  // Sin distancia GPS (0 o null, ej. HIIT): el tiempo entrenado aporta más que "0 m"
  // (mismo criterio que weekly-distance.tsx).
  const value =
    activity.distanceMeters != null && activity.distanceMeters > 0
      ? formatDistance(activity.distanceMeters)
      : formatDuration(activity.durationSeconds ?? 0);

  const timezone = await findUserTimezone(userId);
  const now = new Date();
  const today = localDateString(now, timezone);
  const yesterday = localDateString(new Date(now.getTime() - DAY_MS), timezone);

  // Nombre real del entrenamiento primero (mismo criterio que /activities), el deporte
  // solo como fallback — así se distingue de "es esta actividad reciente" y no solo "Running".
  const label =
    activity.name ?? (activity.sportType ? formatLabel(activity.sportType) : "Activity");

  return (
    <StatTile
      square={square}
      label={label}
      value={value}
      delta={dayLabel(localDateFromTimestamp(activity.startTimeLocal), today, yesterday)}
    />
  );
}
