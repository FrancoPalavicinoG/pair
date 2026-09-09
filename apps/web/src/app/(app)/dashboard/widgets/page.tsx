import { requireSession } from "@/lib/session";
import { showAllWidgets, toggleWidgetVisibility } from "../actions";
import { getEffectiveLayout, getWidgetEntries, type WidgetKey } from "../_components/widgets/registry";
import { Eyebrow } from "@/components/eyebrow";
import { ListRow } from "@/components/list-row";
import { QuietAction } from "@/components/quiet-action";

export default async function DashboardWidgetsPage() {
  const session = await requireSession();
  const [entries, layout] = await Promise.all([
    getWidgetEntries(session.userId),
    getEffectiveLayout(session.userId),
  ]);

  const rows: { key: WidgetKey; label: string; visible: boolean }[] = [];
  for (const entry of entries) {
    const layoutEntry = layout.find((w) => w.key === entry.key);
    const visible = layoutEntry ? layoutEntry.visible : true;
    rows.push({ key: entry.key, label: entry.label, visible });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Eyebrow>Dashboard widgets</Eyebrow>
        <form action={showAllWidgets}>
          <QuietAction type="submit">Select all</QuietAction>
        </form>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.key}>
            <form action={toggleWidgetVisibility.bind(null, row.key)}>
              <ListRow type="submit">
                <span>{row.label}</span>
                <span className={`font-mono ${row.visible ? "text-ember" : "text-graphite"}`}>
                  {row.visible ? "[×]" : "[ ]"}
                </span>
              </ListRow>
            </form>
          </li>
        ))}
      </ul>

      <QuietAction href="/dashboard" className="block">
        Back to dashboard
      </QuietAction>
    </div>
  );
}
