import Link from "next/link";
import type { ReactNode } from "react";
import { findRecentActivities } from "@pair/db";
import { formatDistance, formatDuration } from "@/lib/format";

export async function renderRecentActivities(userId: string): Promise<ReactNode> {
  const activities = await findRecentActivities(userId, 20);
  if (activities.length === 0) return null;

  return (
    <div className="space-y-2 text-left">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">
        Recent activities
      </p>
      <ul className="space-y-1">
        {activities.map((activity) => (
          <li key={activity.id}>
            <Link
              href={`/activities/${activity.garminActivityId}`}
              className="flex items-center justify-between gap-3 border border-rule-soft px-3 py-2 text-sm text-ink transition-colors hover:border-ink"
            >
              <span className="truncate">{activity.name ?? activity.sportType ?? "Activity"}</span>
              <span className="shrink-0 text-graphite">
                {activity.distanceMeters != null ? formatDistance(activity.distanceMeters) : ""}
                {activity.durationSeconds != null
                  ? ` · ${formatDuration(activity.durationSeconds)}`
                  : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
