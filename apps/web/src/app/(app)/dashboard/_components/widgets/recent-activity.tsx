import type { ReactNode } from "react";
import { findRecentActivities } from "@pair/db";
import { formatDistance, formatDuration, formatLabel } from "@/lib/format";
import { StatTile } from "./stat-tile";

export async function renderRecentActivity(userId: string): Promise<ReactNode> {
  const [activity] = await findRecentActivities(userId, 1);
  if (!activity) return null;

  const value =
    activity.distanceMeters != null
      ? formatDistance(activity.distanceMeters)
      : formatDuration(activity.durationSeconds ?? 0);

  return (
    <StatTile
      square
      label={activity.sportType ? formatLabel(activity.sportType) : "Activity"}
      value={value}
      delta={activity.startTimeLocal.toLocaleDateString()}
    />
  );
}
