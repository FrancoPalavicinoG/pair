import type { ReactNode } from "react";
import { findRecentActivities } from "@pair/db";
import { formatDistance, formatDuration } from "@/lib/format";
import { ListRow } from "@/components/list-row";

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
            <ListRow href={`/activities/${activity.garminActivityId}`}>
              <span className="truncate">{activity.name ?? activity.sportType ?? "Activity"}</span>
              <span className="shrink-0 text-graphite">
                {activity.distanceMeters != null ? formatDistance(activity.distanceMeters) : ""}
                {activity.durationSeconds != null
                  ? ` · ${formatDuration(activity.durationSeconds)}`
                  : ""}
              </span>
            </ListRow>
          </li>
        ))}
      </ul>
    </div>
  );
}
