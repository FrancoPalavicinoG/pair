import type { ReactNode } from "react";
import { findRecentActivities, findUserTimezone } from "@pair/db";
import { localDateString } from "@pair/core";
import { formatDistance, formatDuration, formatLabel } from "@/lib/format";
import { dayLabel, localDateFromTimestamp } from "@/lib/activity-date";
import { StatTile } from "./stat-tile";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function renderRecentActivity(userId: string): Promise<ReactNode> {
  const [activity] = await findRecentActivities(userId, 1);
  if (!activity) return null;

  const value =
    activity.distanceMeters != null
      ? formatDistance(activity.distanceMeters)
      : formatDuration(activity.durationSeconds ?? 0);

  const timezone = await findUserTimezone(userId);
  const now = new Date();
  const today = localDateString(now, timezone);
  const yesterday = localDateString(new Date(now.getTime() - DAY_MS), timezone);

  return (
    <StatTile
      square
      label={activity.sportType ? formatLabel(activity.sportType) : "Activity"}
      value={value}
      delta={dayLabel(localDateFromTimestamp(activity.startTimeLocal), today, yesterday)}
    />
  );
}
