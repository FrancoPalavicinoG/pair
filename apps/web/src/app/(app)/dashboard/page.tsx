import { requireSession } from "@/lib/session";
import { findCredentialsByUserId, deriveGarminStatus } from "@pair/db";
import {
  getEffectiveLayout,
  getWidgetEntries,
  type WidgetKey,
} from "./_components/widgets/registry";
import { DashboardLayoutEditor, type WidgetItem } from "./_components/dashboard-layout-editor";
import { Eyebrow } from "@/components/eyebrow";
import { QuietAction } from "@/components/quiet-action";

export default async function DashboardPage() {
  const session = await requireSession();

  const credentials = await findCredentialsByUserId(session.userId);
  const garminStatus = deriveGarminStatus(credentials);

  const entries = await getWidgetEntries(session.userId);
  const entryByKey = new Map(entries.map((entry) => [entry.key as string, entry]));

  const layout = await getEffectiveLayout(session.userId);
  const knownLayout = layout.filter((w) => entryByKey.has(w.key)) as {
    key: WidgetKey;
    visible: boolean;
  }[];

  const visibleWidgets: WidgetItem[] = [];
  const hiddenKeys: WidgetKey[] = [];

  for (const w of knownLayout) {
    if (w.visible) {
      const registryEntry = entryByKey.get(w.key)!;
      const node = await registryEntry.render(session.userId, true);
      if (node) {
        const href = registryEntry.href
          ? await registryEntry.href(session.userId)
          : `/dashboard/metrics/${encodeURIComponent(w.key)}`;
        visibleWidgets.push({ key: w.key, label: registryEntry.label, node, href });
      }
    } else {
      hiddenKeys.push(w.key);
    }
  }

  return (
    <div className="space-y-6">
      <Eyebrow>Dashboard</Eyebrow>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {garminStatus.state === "syncing" && <p className="text-sm text-graphite">Syncing…</p>}
          {garminStatus.state === "synced" && (
            <p className="text-sm text-graphite">
              {garminStatus.lastSyncedAt
                ? `Synced ${garminStatus.lastSyncedAt.toLocaleString()}`
                : "Never synced"}
            </p>
          )}
          <QuietAction href="/dashboard/widgets">Edit widgets</QuietAction>
        </div>

        <DashboardLayoutEditor initialWidgets={visibleWidgets} hiddenKeys={hiddenKeys} />
      </div>
    </div>
  );
}
