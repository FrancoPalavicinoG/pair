import Link from "next/link";
import { requireSession } from "@/lib/session";
import {
  findUserById,
  findCredentialsByUserId,
  findRecentActivities,
  findTodayMetrics,
} from "@pair/db";
import { logout, syncNowAction } from "./actions";
import { SyncStatusPoller } from "./_components/sync-status-poller";
import { formatDistance, formatDuration } from "@/lib/format";

export default async function DashboardPage() {
  const session = await requireSession();
  const user = await findUserById(session.userId);
  if (!user) {
    await logout();
    return;
  }

  const credentials = await findCredentialsByUserId(session.userId);
  let syncStatus: string;
  if (!credentials) {
    syncStatus = "not_connected";
  } else if (credentials.syncInProgress) {
    syncStatus = "syncing";
  } else if (credentials.status !== "active") {
    syncStatus = "needs_reconnect";
  } else {
    syncStatus = "synced";
  }

  const activities = await findRecentActivities(session.userId, 20);
  const todayMetrics = await findTodayMetrics(session.userId);

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-8 text-center">
        <p className="font-mono text-sm text-ink">{user.email}</p>

        {syncStatus === "not_connected" && (
          <Link
            href="/settings/garmin"
            className="block w-full border border-ink px-4 py-2.5 text-center text-ink transition-colors hover:bg-ink hover:text-bone"
          >
            Connect Garmin
          </Link>
        )}

        {syncStatus === "syncing" && (
          <>
            <p className="text-sm text-graphite">Syncing…</p>
            <SyncStatusPoller syncInProgress />
          </>
        )}

        {syncStatus === "needs_reconnect" && (
          <>
            <p className="text-sm text-ink">
              <span aria-hidden>× </span>Garmin disconnected
            </p>
            <Link
              href="/settings/garmin"
              className="block w-full border border-ink px-4 py-2.5 text-center text-ink transition-colors hover:bg-ink hover:text-bone"
            >
              Reconnect Garmin
            </Link>
          </>
        )}

        {syncStatus === "synced" && credentials && (
          <>
            <p className="text-sm text-graphite">
              Last synced:{" "}
              {credentials.lastSyncedAt ? credentials.lastSyncedAt.toLocaleString() : "never"}
            </p>
            <form action={syncNowAction}>
              <button
                type="submit"
                className="w-full border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-bone"
              >
                Sync now
              </button>
            </form>
          </>
        )}

        {todayMetrics && (
          <div className="space-y-2 border border-rule-soft p-4 text-left">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">Today</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ink">
              {todayMetrics.steps != null && <p>{todayMetrics.steps} steps</p>}
              {todayMetrics.restingHeartRate != null && (
                <p>{todayMetrics.restingHeartRate} bpm resting</p>
              )}
              {todayMetrics.sleepSeconds != null && (
                <p>{formatDuration(todayMetrics.sleepSeconds)} sleep</p>
              )}
              {todayMetrics.bodyBattery != null && <p>{todayMetrics.bodyBattery} body battery</p>}
            </div>
          </div>
        )}

        {activities.length > 0 && (
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
                    <span className="truncate">
                      {activity.name ?? activity.sportType ?? "Activity"}
                    </span>
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
        )}

        <form action={logout}>
          <button
            type="submit"
            className="w-full border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-bone"
          >
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}
