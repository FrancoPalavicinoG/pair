import type { ReactNode } from "react";
import { findWeeklySummary } from "@pair/db";
import { formatDistance } from "@/lib/format";

export async function renderWeeklySummary(userId: string): Promise<ReactNode> {
  const summary = await findWeeklySummary(userId);

  let deltaText: string | null = null;
  const thisWeekDistance = summary.thisWeek.distanceMeters;
  const lastWeekDistance = summary.lastWeek.distanceMeters;

  if (lastWeekDistance === 0) {
    // Primera semana con datos, no se puede calcular el % de variación.
    deltaText = null;
  } else {
    const changePercent = ((thisWeekDistance - lastWeekDistance) / lastWeekDistance) * 100;
    const sign = changePercent >= 0 ? "+" : "−";
    deltaText = `${sign}${Math.abs(changePercent).toFixed(0)}% vs last week`;
  }

  return (
    <div className="space-y-1 text-left">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">This week</p>
      <p className="text-2xl font-extrabold text-ink">
        {formatDistance(summary.thisWeek.distanceMeters)}
      </p>
      <p className="font-mono text-xs text-graphite">{deltaText ?? "First week with data"}</p>
    </div>
  );
}
