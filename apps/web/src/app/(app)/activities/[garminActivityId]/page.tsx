import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { findActivityByGarminId } from "@pair/db";
import { fetchActivityDetail } from "@pair/sync";
import { GarminApiError } from "@pair/core";
import { formatDistance, formatDuration, formatPace } from "@/lib/format";

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
        <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm space-y-2 text-center">
            <p className="text-sm text-ink">
              <span aria-hidden>× </span>Couldn&apos;t load this activity right now
            </p>
            <p className="text-xs text-graphite">{err.message}</p>
          </div>
        </main>
      );
    }
    throw err;
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6 text-left">
        <div>
          <h1 className="text-lg text-ink">{activity.name ?? activity.sportType ?? "Activity"}</h1>
          <p className="text-sm text-graphite">
            {activity.sportType} · {activity.startTimeLocal.toLocaleDateString()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border border-rule-soft p-4 text-sm text-ink">
          {activity.distanceMeters != null && <p>{formatDistance(activity.distanceMeters)}</p>}
          {activity.durationSeconds != null && <p>{formatDuration(activity.durationSeconds)}</p>}
          {detail.distance != null && detail.duration != null && (
            <p>{formatPace(detail.distance, detail.duration)}</p>
          )}
          {detail.averageHR != null && <p>{detail.averageHR} bpm avg</p>}
          {detail.maxHR != null && <p>{detail.maxHR} bpm max</p>}
          {detail.trainingEffect != null && <p>Training effect {detail.trainingEffect.toFixed(1)}</p>}
        </div>
      </div>
    </main>
  );
}
