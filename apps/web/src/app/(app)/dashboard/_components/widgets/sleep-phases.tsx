import type { ReactNode } from "react";
import { findTodayMetrics } from "@pair/db";
import { formatDuration } from "@pair/core";
import { TileShell } from "./stat-tile";
import { SleepPhaseBar } from "@/components/sleep-phase-bar";

// Unifica lo que antes eran dos widgets (sleep score + sleep phases): horas dormidas +
// score como texto chico (un gauge circular no entra junto al timeline en el tile de
// 180px), más el timeline cronológico real de la noche.
export async function renderSleepPhases(userId: string): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  const segments = today?.sleepStages;
  if (!segments?.length) return null;

  return (
    <TileShell label="Sleep">
      <div className="mb-2.5 flex items-baseline justify-between">
        <p className="font-display text-[22px] leading-none tracking-[-0.03em] text-ink transition-colors duration-[250ms] group-hover:text-bone">
          {today?.sleepSeconds != null ? formatDuration(today.sleepSeconds) : "—"}
        </p>
        {today?.sleepScore != null && (
          <p className="font-mono text-xs text-graphite">Score {today.sleepScore}</p>
        )}
      </div>
      <SleepPhaseBar segments={segments} />
    </TileShell>
  );
}
