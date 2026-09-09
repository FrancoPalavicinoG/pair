import type { ReactNode } from "react";
import { findTodayMetrics } from "@pair/db";
import { formatLabel } from "@/lib/format";
import { StatTile } from "./stat-tile";

export async function renderHrv(userId: string, square = true): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  if (!today) return null;

  const value = today.hrvLastNightAvg;
  if (value == null) return null;

  const delta = today.hrvStatus ? formatLabel(today.hrvStatus) : undefined;

  return <StatTile square={square} label="HRV" value={String(value)} unit="ms" delta={delta} />;
}
