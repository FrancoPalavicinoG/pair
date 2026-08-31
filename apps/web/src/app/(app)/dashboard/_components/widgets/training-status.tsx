import type { ReactNode } from "react";
import { findTodayMetrics } from "@pair/db";
import { formatLabel } from "@/lib/format";
import { TileShell } from "./stat-tile";

// Frase de Garmin ("STRAINED_1"), largo variable y sin confirmar — StatTile's fixed
// 32px asume valores numéricos cortos, tamaño más chico + wrap acá para no desbordar.
export async function renderTrainingStatus(userId: string): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  const phrase = today?.trainingStatusPhrase;
  if (!phrase) return null;

  return (
    <TileShell label="Training status">
      <p className="font-display text-[22px] leading-tight tracking-[-0.02em] text-ink transition-colors duration-[250ms] group-hover:text-bone">
        {formatLabel(phrase)}
      </p>
    </TileShell>
  );
}
