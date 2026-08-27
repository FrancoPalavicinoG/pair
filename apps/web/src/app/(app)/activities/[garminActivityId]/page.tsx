import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { findActivityByGarminId } from "@pair/db";
import { fetchActivityDetail } from "@pair/sync";
import { GarminApiError } from "@pair/core";
import { formatDistance, formatDuration, formatPace } from "@/lib/format";
import { Eyebrow } from "@/components/eyebrow";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ garminActivityId: string }>;
}) {
  const { garminActivityId } = await params;
  const id = Number(garminActivityId);
  if (isNaN(id)) {
    notFound();
  }

  const session = await requireSession();
  const activity = await findActivityByGarminId(session.userId, id);
  if (!activity) {
    notFound();
  }

  let detail;
  try {
    detail = await fetchActivityDetail(session.userId, id);
  } catch (err) {
    if (err instanceof GarminApiError) {
      return (
        <div className="max-w-md space-y-2">
          <p className="text-sm text-ink">
            <span aria-hidden>× </span>Couldn&apos;t load this activity right now
          </p>
          <p className="text-xs text-graphite">{err.message}</p>
        </div>
      );
    }
    throw err;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-1">
        <Eyebrow>{activity.sportType ?? "Activity"}</Eyebrow>
        <h1 className="font-display text-3xl text-ink">
          {activity.name ?? activity.sportType ?? "Activity"}
        </h1>
        <p className="text-sm text-graphite">{activity.startTimeLocal.toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-3 gap-px bg-rule-soft">
        {activity.distanceMeters != null && (
          <p className="bg-lcd p-4 text-sm text-ink">{formatDistance(activity.distanceMeters)}</p>
        )}
        {activity.durationSeconds != null && (
          <p className="bg-lcd p-4 text-sm text-ink">{formatDuration(activity.durationSeconds)}</p>
        )}
        {detail.distance != null && detail.duration != null && (
          <p className="bg-lcd p-4 text-sm text-ink">{formatPace(detail.distance, detail.duration)}</p>
        )}
        {detail.averageHR != null && (
          <p className="bg-lcd p-4 text-sm text-ink">{detail.averageHR} bpm avg</p>
        )}
        {detail.maxHR != null && <p className="bg-lcd p-4 text-sm text-ink">{detail.maxHR} bpm max</p>}
        {detail.trainingEffect != null && (
          <p className="bg-lcd p-4 text-sm text-ink">
            Training effect {detail.trainingEffect.toFixed(1)}
          </p>
        )}
      </div>
    </div>
  );
}
