import type { ReactNode } from "react";
import { findTodayMetrics } from "@pair/db";
import { TileShell } from "./stat-tile";
import { SleepPhaseBar } from "@/components/sleep-phase-bar";

// Fondo claro por defecto, como cualquier otra tile — invierte a oscuro en hover
// (`SleepPhaseBar` y `TileShell` ya lo manejan solos, nada especial acá).
export async function renderSleepPhases(userId: string): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  if (
    today?.deepSleepSeconds == null ||
    today?.lightSleepSeconds == null ||
    today?.remSleepSeconds == null ||
    today?.awakeSleepSeconds == null
  ) {
    return null;
  }

  return (
    <TileShell label="Sleep phases">
      <SleepPhaseBar
        phases={{
          deep: today.deepSleepSeconds,
          light: today.lightSleepSeconds,
          rem: today.remSleepSeconds,
          awake: today.awakeSleepSeconds,
        }}
      />
    </TileShell>
  );
}
