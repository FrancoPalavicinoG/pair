import type { ReactNode } from "react";
import { findTodayMetrics } from "@pair/db";
import { formatDuration } from "@/lib/format";

export async function renderTodayMetrics(userId: string): Promise<ReactNode> {
  const todayMetrics = await findTodayMetrics(userId);
  if (!todayMetrics) return null;

  return (
    <div className="space-y-2 border border-rule-soft p-4 text-left">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">Today</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ink">
        {todayMetrics.steps != null && <p>{todayMetrics.steps} steps</p>}
        {todayMetrics.restingHeartRate != null && (
          <p>{todayMetrics.restingHeartRate} bpm resting</p>
        )}
        {todayMetrics.sleepSeconds != null && <p>{formatDuration(todayMetrics.sleepSeconds)} sleep</p>}
        {todayMetrics.bodyBattery != null && <p>{todayMetrics.bodyBattery} body battery</p>}
      </div>
    </div>
  );
}
