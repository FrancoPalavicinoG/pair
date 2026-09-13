import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getWidgetEntries } from "../../_components/widgets/registry";
import { Eyebrow } from "@/components/eyebrow";

export default async function DashboardMetricDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  const session = await requireSession();
  const entries = await getWidgetEntries(session.userId);
  const entry = entries.find((e) => e.key === decodedKey);
  if (!entry) {
    notFound();
  }

  const node = await entry.render(session.userId, false);

  return (
    <div className="space-y-6">
      <Eyebrow>{entry.label}</Eyebrow>
      {node}
    </div>
  );
}
