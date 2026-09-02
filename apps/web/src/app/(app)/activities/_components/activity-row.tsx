import Link from "next/link";
import type { Activity } from "@pair/db";
import { formatDistance, formatDuration, formatPace, formatLabel } from "@/lib/format";
import { formatActivityTime } from "@/lib/activity-date";
import { getActivityCategory, ACTIVITY_CATEGORY_LABEL } from "@/lib/activity-category";
import { ACTIVITY_ICON } from "@/components/icons/activity-icons";
import { ROW_CHROME } from "@/components/list-row";

const GRID_COLUMNS = "20px 1fr 64px 72px 72px 96px";

// Fila de /activities: grid real (icono · nombre+categoria · hora · distancia · duracion ·
// pace), a diferencia de ListRow (2 slots con justify-between) porque acá hay más columnas
// de dato relacionado que respirar (docs/style.md, "Layout de escritorio").
export function ActivityRow({ activity }: { activity: Activity }) {
  const category = getActivityCategory(activity.sportType);
  const Icon = ACTIVITY_ICON[category];

  return (
    <Link
      href={`/activities/${activity.garminActivityId}`}
      className={`group grid items-center gap-3 ${ROW_CHROME}`}
      style={{ gridTemplateColumns: GRID_COLUMNS }}
    >
      <Icon className="shrink-0 text-ember" />

      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate">{activity.name ?? ACTIVITY_CATEGORY_LABEL[category]}</span>
        <span className="shrink-0 font-mono text-xs text-graphite">
          {activity.sportType ? formatLabel(activity.sportType) : ACTIVITY_CATEGORY_LABEL[category]}
        </span>
      </span>

      <span className="text-right font-mono text-xs text-graphite">
        {formatActivityTime(activity.startTimeLocal)}
      </span>
      <span className="text-right text-graphite">
        {activity.distanceMeters != null ? formatDistance(activity.distanceMeters) : "–"}
      </span>
      <span className="text-right text-graphite">
        {activity.durationSeconds != null ? formatDuration(activity.durationSeconds) : "–"}
      </span>
      <span className="text-right text-graphite">
        {activity.distanceMeters != null && activity.durationSeconds != null
          ? formatPace(activity.distanceMeters, activity.durationSeconds)
          : "–"}
      </span>
    </Link>
  );
}
