import type { ReactNode } from "react";
import { findTodayMetrics } from "@pair/db";
import { TileShell } from "./stat-tile";
import { GaugeChart } from "@/components/gauge-chart";

export async function renderHeatAcclimation(userId: string): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  const value = today?.heatAcclimationPercent;
  if (value == null) return null;

  return (
    <TileShell label="Heat acclimation">
      <GaugeChart value={value} max={100} label="Today" />
    </TileShell>
  );
}
