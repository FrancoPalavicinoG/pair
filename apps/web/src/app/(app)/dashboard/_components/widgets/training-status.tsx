import type { ReactNode } from "react";
import { findRecentDailyMetrics, findTodayMetrics } from "@pair/db";
import { formatLabel } from "@/lib/format";
import { formatShortDate } from "@/lib/activity-date";
import { TileShell } from "./stat-tile";

// Los 10 estados confirmados por Franco, mapeados a la rampa de zona (docs/specs/
// app-dashboard-garmin-style-widgets.md) — Garmin no publica qué color usa para cada uno,
// es nuestra interpretación de "qué tan favorable" (peor -> mejor), Recuperación/
// Mantenimiento como punto medio neutro-positivo. `null` = gris, fuera de la rampa (no es
// "malo", es "no hay estado" o "pausa deliberada"). El sufijo "_1"/"_2" de severidad
// (confirmado real: "STRAINED_1") se descarta antes de buscar — mismo estado base.
const TRAINING_STATUS_ZONE: Record<string, string | null> = {
  OVERTRAINING: "var(--zone1)",
  STRAINED: "var(--zone2)",
  UNPRODUCTIVE: "var(--zone2)",
  DETRAINING: "var(--zone2)",
  RECOVERY: "var(--zone3)",
  MAINTAINING: "var(--zone3)",
  PRODUCTIVE: "var(--zone4)",
  PEAKING: "var(--zone5)",
  NO_STATUS: null,
  PAUSED: null,
};

function trainingStatusZone(phrase: string): string | null {
  const base = phrase.replace(/_\d+$/, "");
  return TRAINING_STATUS_ZONE[base] ?? null;
}

const HISTORY_DAYS = 60;
const WEEK_CHIPS = 4;
const WEEK_DAYS = 7;

// Frase de Garmin ("STRAINED_1"), largo variable y sin confirmar — StatTile's fixed
// 32px asume valores numéricos cortos, tamaño más chico + wrap acá para no desbordar.
// Una sola palabra larga ("Unproductive") ya toca el límite de los 140px de contenido
// del tile mínimo (180px, 15 widgets activos) — break-words parte la palabra si hace falta.
export async function renderTrainingStatus(userId: string, square = true): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  const phrase = today?.trainingStatusPhrase;
  if (!phrase) return null;

  const history = await findRecentDailyMetrics(userId, HISTORY_DAYS);

  // Racha actual: escanea hacia atrás mientras la frase no cambie.
  let since = today.date;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.trainingStatusPhrase !== phrase) break;
    since = history[i]!.date;
  }

  // Últimas 4 semanas: 4 baldes de 7 días (el más reciente último), coloreados por el
  // estado más reciente de cada balde. No calendario lunes-domingo — simplificación
  // nuestra, ver docs/specs/app-dashboard-garmin-style-widgets.md, Preguntas abiertas.
  const last28 = history.slice(-WEEK_CHIPS * WEEK_DAYS);
  const weeks: (string | null)[] = [];
  for (let w = 0; w < WEEK_CHIPS; w++) {
    const chunk = last28.slice(w * WEEK_DAYS, (w + 1) * WEEK_DAYS);
    const lastKnown = [...chunk].reverse().find((row) => row.trainingStatusPhrase);
    weeks.push(
      lastKnown?.trainingStatusPhrase ? trainingStatusZone(lastKnown.trainingStatusPhrase) : null,
    );
  }

  return (
    <TileShell label="Training status" square={square}>
      <p className="font-display break-words text-[18px] leading-tight tracking-[-0.02em] text-ink transition-colors duration-[250ms] group-hover:text-bone">
        {formatLabel(phrase)}
      </p>
      <p className="mt-1 font-mono text-xs text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
        Since {formatShortDate(since)}
      </p>
      <div className="mt-auto border-t border-rule-soft pt-2.5">
        <div className="flex gap-1">
          {weeks.map((color, i) => (
            <span
              key={i}
              aria-hidden
              className="h-4 flex-1"
              style={{ backgroundColor: color ?? "var(--rule-soft)" }}
            />
          ))}
        </div>
        <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
          Last 4 weeks
        </p>
      </div>
    </TileShell>
  );
}
