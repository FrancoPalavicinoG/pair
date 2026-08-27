import Link from "next/link";
import { requireSession } from "@/lib/session";
import { findCredentialsByUserId } from "@pair/db";
import { syncNowAction } from "./actions";
import { SyncStatusPoller } from "./_components/sync-status-poller";
import {
  getEffectiveLayout,
  WIDGET_REGISTRY,
  type WidgetKey,
} from "./_components/widgets/registry";
import { DashboardLayoutEditor, type WidgetItem } from "./_components/dashboard-layout-editor";
import { Eyebrow } from "@/components/eyebrow";

export default async function DashboardPage() {
  const session = await requireSession();

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
      if (node) visibleWidgets.push({ key: w.key, label: registryEntry.label, node });
    } else {
      hiddenKeys.push(w.key);
    }
  }

  return (
    <div className="space-y-10">
      <Eyebrow>Dashboard</Eyebrow>

      {syncStatus === "not_connected" && (
        <div className="flex items-center justify-between gap-4 border border-rule-soft px-5 py-4">
          <p className="text-sm text-graphite">Garmin isn&apos;t connected yet.</p>
          <Link
            href="/settings/garmin"
            className="border border-ink px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-bone"
          >
            Connect Garmin
          </Link>
        </div>
      )}

      {syncStatus === "syncing" && (
        <div className="flex items-center justify-between gap-4 border border-rule-soft px-5 py-4">
          <p className="text-sm text-graphite">Syncing…</p>
          <SyncStatusPoller syncInProgress />
        </div>
      )}

      {syncStatus === "needs_reconnect" && (
        <div className="flex items-center justify-between gap-4 border border-rule-soft px-5 py-4">
          <p className="text-sm text-ink">
            <span aria-hidden>× </span>Garmin disconnected
          </p>
          <Link
            href="/settings/garmin"
            className="border border-ink px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-bone"
          >
            Reconnect Garmin
          </Link>
        </div>
      )}

      {syncStatus === "synced" && credentials && (
        <div className="flex items-center justify-between gap-4 border border-rule-soft px-5 py-4">
          <p className="text-sm text-graphite">
            Last synced:{" "}
            {credentials.lastSyncedAt ? credentials.lastSyncedAt.toLocaleString() : "never"}
          </p>
          <form action={syncNowAction}>
            <button
              type="submit"
              className="border border-ink px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-bone"
            >
              Sync now
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">Widgets</p>
          <Link
            href="/dashboard/widgets"
            className="font-mono text-xs uppercase tracking-[0.1em] text-graphite transition-colors hover:text-ink"
          >
            Edit widgets
          </Link>
        </div>
        <DashboardLayoutEditor initialWidgets={visibleWidgets} hiddenKeys={hiddenKeys} />
      </div>
    </div>
  );
}
