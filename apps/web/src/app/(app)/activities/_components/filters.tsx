import Link from "next/link";
import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_LABEL, type ActivityCategory } from "@/lib/activity-category";
import type { ActivityRange } from "@pair/db";

const RANGE_LABEL: Record<ActivityRange, string> = {
  this_week: "This week",
  this_month: "This month",
  all: "All time",
};

// Chips de filtro (docs/style.md, "Chips de filtro"): links reales que arman la URL,
// selección única — el chip activo es el que matchea el searchParams actual.
function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`border px-2.5 py-1 font-mono text-xs uppercase tracking-[0.08em] transition-colors ${
        active ? "border-ember text-ember" : "border-rule-soft text-graphite hover:border-ink hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export function Filters({
  category,
  range,
}: {
  category?: ActivityCategory;
  range?: ActivityRange;
}) {
  function buildHref(next: { category?: ActivityCategory; range?: ActivityRange }) {
    const params = new URLSearchParams();
    const nextCategory = "category" in next ? next.category : category;
    const nextRange = "range" in next ? next.range : range;
    if (nextCategory) params.set("category", nextCategory);
    if (nextRange && nextRange !== "all") params.set("range", nextRange);
    const query = params.toString();
    return query ? `/activities?${query}` : "/activities";
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Chip href={buildHref({ category: undefined })} active={category === undefined}>
          All
        </Chip>
        {ACTIVITY_CATEGORIES.map((c) => (
          <Chip key={c} href={buildHref({ category: c })} active={category === c}>
            {ACTIVITY_CATEGORY_LABEL[c]}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(RANGE_LABEL) as ActivityRange[]).map((r) => (
          <Chip
            key={r}
            href={buildHref({ range: r === "all" ? undefined : r })}
            active={(range ?? "all") === r}
          >
            {RANGE_LABEL[r]}
          </Chip>
        ))}
      </div>
    </div>
  );
}
