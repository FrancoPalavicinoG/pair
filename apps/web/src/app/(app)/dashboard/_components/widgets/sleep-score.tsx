import type { ReactNode } from "react";
import { findTodayMetrics } from "@pair/db";
import { TileShell } from "./stat-tile";
import { GaugeChart } from "@/components/gauge-chart";

export async function renderSleepScore(userId: string): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  const value = today?.sleepScore;
  if (value == null) return null;

  return (
    <TileShell label="Sleep score">
      <GaugeChart value={value} max={100} label="Today" />
    </TileShell>
  );
}
