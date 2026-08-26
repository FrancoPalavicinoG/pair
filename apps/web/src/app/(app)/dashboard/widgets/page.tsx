import Link from "next/link";
import { requireSession } from "@/lib/session";
import { toggleWidgetVisibility } from "../actions";
import {
  getEffectiveLayout,
  WIDGET_REGISTRY,
  type WidgetKey,
} from "../_components/widgets/registry";

export default async function DashboardWidgetsPage() {
  const session = await requireSession();
  const layout = await getEffectiveLayout(session.userId);

  const rows: { key: WidgetKey; label: string; visible: boolean }[] = [];
  for (const key of Object.keys(WIDGET_REGISTRY) as WidgetKey[]) {
    const registryEntry = WIDGET_REGISTRY[key];
    const layoutEntry = layout.find((w) => w.key === key);
    const visible = layoutEntry ? layoutEntry.visible : true;
    rows.push({ key, label: registryEntry.label, visible });
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6 text-left">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">
          Dashboard widgets
        </p>

        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key}>
              <form action={toggleWidgetVisibility.bind(null, row.key)}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-3 border border-rule-soft px-3 py-2 text-sm text-ink transition-colors hover:border-ink"
                >
                  <span>{row.label}</span>
                  <span className={`font-mono ${row.visible ? "text-ember" : "text-graphite"}`}>
                    {row.visible ? "[×]" : "[ ]"}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard"
          className="block text-center font-mono text-xs uppercase tracking-[0.1em] text-graphite transition-colors hover:text-ink"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
