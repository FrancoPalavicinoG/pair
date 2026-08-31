import type { ReactNode } from "react";
import { findTodayMetrics } from "@pair/db";
import { TileShell } from "./stat-tile";

// Garmin ya calcula ACWR (docs/garmin-api.md) — se trae el número, no se deriva acá.
export async function renderTrainingLoad(userId: string): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  const acwr = today?.acwr;
  if (acwr == null) return null;

  return (
    <TileShell label="Training load">
      <p className="font-display mb-1.5 text-[32px] leading-none tracking-[-0.03em] text-ink transition-colors duration-[250ms] group-hover:text-bone">
        {acwr.toFixed(1)}
      </p>
      <p className="font-mono text-xs text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
        {today?.acuteLoad ?? "–"} acute / {today?.chronicLoad ?? "–"} chronic
      </p>
    </TileShell>
  );
}
