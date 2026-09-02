import { z } from "zod";
import { requireSession } from "@/lib/session";
import { findActivities, findUserTimezone } from "@pair/db";
import { localDateString } from "@pair/core";
import { formatDistance, formatDuration } from "@/lib/format";
import { ACTIVITY_CATEGORIES, getSportTypesForCategory } from "@/lib/activity-category";
import { groupActivitiesByDate } from "@/lib/activity-date";
import { Eyebrow } from "@/components/eyebrow";
import { ActivityRow } from "./_components/activity-row";
import { Filters } from "./_components/filters";

const LIMIT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

const searchParamsSchema = z.object({
  category: z.enum(ACTIVITY_CATEGORIES).optional(),
  range: z.enum(["this_week", "this_month", "all"]).optional(),
});

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireSession();
  const raw = await searchParams;
  const { category, range } = searchParamsSchema.parse({
    category: typeof raw.category === "string" ? raw.category : undefined,
    range: typeof raw.range === "string" ? raw.range : undefined,
  });

  const sportTypes = category ? getSportTypesForCategory(category) : undefined;
  const activities = await findActivities(session.userId, { limit: LIMIT, sportTypes, range });

  const timezone = await findUserTimezone(session.userId);
  const now = new Date();
  const todayLocalDate = localDateString(now, timezone);
  const yesterdayLocalDate = localDateString(new Date(now.getTime() - DAY_MS), timezone);
  const groups = groupActivitiesByDate(activities, todayLocalDate, yesterdayLocalDate);

  const totalDistance = activities.reduce((sum, a) => sum + (a.distanceMeters ?? 0), 0);
  const totalDuration = activities.reduce((sum, a) => sum + (a.durationSeconds ?? 0), 0);
  const hasFilters = category !== undefined || (range !== undefined && range !== "all");

  return (
    <div className="space-y-6">
      <Eyebrow>Activities</Eyebrow>

      <Filters category={category} range={range} />

      {activities.length > 0 && (
        <p className="font-mono text-xs text-graphite">
          {activities.length} {activities.length === 1 ? "activity" : "activities"}
          {totalDistance > 0 && ` · ${formatDistance(totalDistance)}`}
          {totalDuration > 0 && ` · ${formatDuration(totalDuration)}`}
        </p>
      )}

      {activities.length === 0 ? (
        <p className="text-sm text-graphite">
          {hasFilters ? "No activities match these filters." : "No activities synced yet."}
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">
                {group.label} · {group.items.length} {group.items.length === 1 ? "activity" : "activities"}
              </p>
              <ul className="space-y-1">
                {group.items.map((activity) => (
                  <li key={activity.id}>
                    <ActivityRow activity={activity} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
