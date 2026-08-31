import { requireSession } from "@/lib/session";
import { findRecentActivities } from "@pair/db";
import { formatDistance, formatDuration } from "@/lib/format";
import { Eyebrow } from "@/components/eyebrow";
import { ListRow } from "@/components/list-row";

const LIMIT = 100;

export default async function ActivitiesPage() {
  const session = await requireSession();
  const activities = await findRecentActivities(session.userId, LIMIT);

  return (
    <div className="max-w-2xl space-y-8">
      <Eyebrow>Activities</Eyebrow>

      {activities.length === 0 ? (
        <p className="text-sm text-graphite">No activities synced yet.</p>
      ) : (
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
      )}
    </div>
  );
}
