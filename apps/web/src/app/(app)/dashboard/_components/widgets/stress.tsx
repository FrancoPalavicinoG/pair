import type { ReactNode } from "react";
import { findTodayMetrics } from "@pair/db";
import { TileShell } from "./stat-tile";
import { GaugeChart } from "@/components/gauge-chart";

export async function renderStress(userId: string): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  const value = today?.stressAverage;
  if (value == null) return null;

  return (
    <TileShell label="Stress">
      <GaugeChart value={value} max={100} label="Today" />
    </TileShell>
  );
}
