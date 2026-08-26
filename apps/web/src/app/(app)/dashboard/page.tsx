import Link from "next/link";
import { requireSession } from "@/lib/session";
import { findUserById, findCredentialsByUserId } from "@pair/db";
import { logout, syncNowAction } from "./actions";
import { SyncStatusPoller } from "./_components/sync-status-poller";
import {
  getEffectiveLayout,
  WIDGET_REGISTRY,
  type WidgetKey,
} from "./_components/widgets/registry";
import { DashboardLayoutEditor, type WidgetItem } from "./_components/dashboard-layout-editor";

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

  const layout = await getEffectiveLayout(session.userId);
  const knownLayout = layout.filter((w) => w.key in WIDGET_REGISTRY) as {
    key: WidgetKey;
    visible: boolean;
  }[];

  const visibleWidgets: WidgetItem[] = [];
  const hiddenKeys: WidgetKey[] = [];

  for (const w of knownLayout) {
    if (w.visible) {
      const registryEntry = WIDGET_REGISTRY[w.key];
      const node = await registryEntry.render(session.userId);
      visibleWidgets.push({ key: w.key, label: registryEntry.label, node });
    } else {
      hiddenKeys.push(w.key);
    }
  }

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

        <DashboardLayoutEditor initialWidgets={visibleWidgets} hiddenKeys={hiddenKeys} />

        <Link
          href="/dashboard/widgets"
          className="block text-center font-mono text-xs uppercase tracking-[0.1em] text-graphite transition-colors hover:text-ink"
        >
          Edit widgets
        </Link>

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
