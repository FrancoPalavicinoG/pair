import type { ReactNode } from "react";
import { findTodayMetrics } from "@pair/db";
import { formatLabel } from "@/lib/format";
import { TileShell } from "./stat-tile";
import { GaugeChart } from "@/components/gauge-chart";

export async function renderReadiness(userId: string): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  if (!today) return null;

  const value = today.readinessScore;
  if (value == null) return null;

  const label = today.readinessLevel ? formatLabel(today.readinessLevel) : "Today";

  return (
    <TileShell label="Readiness">
      <GaugeChart value={value} max={100} label={label} />
    </TileShell>
  );
}
