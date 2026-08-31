import Link from "next/link";
import { requireSession } from "@/lib/session";
import { toggleWidgetVisibility } from "../actions";
import { getEffectiveLayout, getWidgetEntries, type WidgetKey } from "../_components/widgets/registry";
import { Eyebrow } from "@/components/eyebrow";
import { ListRow } from "@/components/list-row";

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
    <div className="max-w-md space-y-8">
      <Eyebrow>Dashboard widgets</Eyebrow>

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

      <Link
        href="/dashboard"
        className="block font-mono text-xs uppercase tracking-[0.1em] text-graphite transition-colors hover:text-ink"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
