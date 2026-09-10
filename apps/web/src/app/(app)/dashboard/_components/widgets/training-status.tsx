import type { ReactNode } from "react";
import { findRecentDailyMetrics, findTodayMetrics, type DailyMetricsRow } from "@pair/db";
import { formatLabel } from "@/lib/format";
import { formatShortDate } from "@/lib/activity-date";
import { TileShell } from "./stat-tile";

// Colores por estado, definidos por Franco (docs/specs/app-dashboard-garmin-style-widgets.md)
// — categórico, no ordinal: cada estado tiene su propio hue en vez de compartir una rampa de
// "peor a mejor". Reusa --zone1/2/3/4/5 donde ya había un hue validado que calzaba; --status-
// strained (magenta) y --status-maintaining (amarillo/oliva) son los dos hues nuevos. Aceptado
// por Franco a sabiendas: --status-maintaining NO pasa scripts/validate_palette.js frente a
// --zone1 (rojo) — ΔE 14.2 de visión normal (piso 15) y ΔE 4.0 bajo protanopía simulada (piso
// 6.0), además de quedar justo bajo el piso de croma. Es la mejor opción real: no existe un
// amarillo en toda la banda de luminosidad/croma de este sistema que se distinga a la vez del
// naranja y del verde ya shippeados (buscado exhaustivamente). Mitigación: el chip siempre
// lleva el nombre del estado como texto al lado (nunca color solo, docs/style.md). `null` =
// gris (--rule-soft en la barra): no hay estado o pausa deliberada. El sufijo "_1".."_5" de
// severidad (confirmado real: variable día a día, ej. "PRODUCTIVE_1" -> "PRODUCTIVE_5") se
// descarta antes de buscar — mismo estado base.
const TRAINING_STATUS_ZONE: Record<string, string | null> = {
  OVERTRAINING: "var(--zone1)", // rojo
  STRAINED: "var(--status-strained)", // magenta
  UNPRODUCTIVE: "var(--zone2)", // naranja
  DETRAINING: null, // gris
  RECOVERY: "var(--zone4)", // azul
  MAINTAINING: "var(--status-maintaining)", // amarillo/oliva
  PRODUCTIVE: "var(--zone3)", // verde
  PEAKING: "var(--zone5)", // violeta
  NO_STATUS: null, // gris
  PAUSED: null, // gris
};

function baseTrainingStatus(phrase: string): string {
  return phrase.replace(/_\d+$/, "");
}

function trainingStatusZone(base: string): string | null {
  return TRAINING_STATUS_ZONE[base] ?? null;
}

const HISTORY_DAYS = 60;
const TIMELINE_DAYS = 28;

type StatusSegment = { base: string | null; days: number };

// Corre los últimos `TIMELINE_DAYS` días agrupando corridas consecutivas del mismo estado
// base — el ancho de cada segmento en la barra queda proporcional a cuánto duró de verdad,
// con el corte exactamente en la fecha donde cambió (no baldes de calendario artificiales).
function buildStatusSegments(rows: DailyMetricsRow[]): StatusSegment[] {
  const segments: StatusSegment[] = [];
  for (const row of rows) {
    const base = row.trainingStatusPhrase ? baseTrainingStatus(row.trainingStatusPhrase) : null;
    const last = segments[segments.length - 1];
    if (last && last.base === base) {
      last.days += 1;
    } else {
      segments.push({ base, days: 1 });
    }
  }
  return segments;
}

// Frase de Garmin ("STRAINED_1"), largo variable y sin confirmar — StatTile's fixed
// 32px asume valores numéricos cortos, tamaño más chico + wrap acá para no desbordar.
// Una sola palabra larga ("Unproductive") ya toca el límite de los 140px de contenido
// del tile mínimo (180px, 15 widgets activos) — break-words parte la palabra si hace falta.
export async function renderTrainingStatus(userId: string, square = true): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  const phrase = today?.trainingStatusPhrase;
  if (!phrase) return null;

  const history = await findRecentDailyMetrics(userId, HISTORY_DAYS);

  // Racha actual: escanea hacia atrás mientras el estado base no cambie (el sufijo de
  // severidad, ej. "PRODUCTIVE_1" -> "PRODUCTIVE_5", cambia día a día sin que el estado
  // cambie realmente — comparar la frase completa cortaba la racha en el primer paso).
  const base = baseTrainingStatus(phrase);
  let since = today.date;
  for (let i = history.length - 1; i >= 0; i--) {
    const rowPhrase = history[i]?.trainingStatusPhrase;
    if (!rowPhrase || baseTrainingStatus(rowPhrase) !== base) break;
    since = history[i]!.date;
  }

  const segments = buildStatusSegments(history.slice(-TIMELINE_DAYS));

  return (
    <TileShell label="Training status" square={square}>
      <p className="font-display break-words text-[18px] leading-tight tracking-[-0.02em] text-ink transition-colors duration-[250ms] group-hover:text-bone">
        {formatLabel(base)}
      </p>
      <p className="mt-1 font-mono text-xs text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
        Since {formatShortDate(since)}
      </p>
      <div className="mt-auto border-t border-rule-soft pt-2.5">
        <div className="flex gap-[2px]">
          {segments.map((segment, i) => (
            <span
              key={i}
              aria-hidden
              className="h-4"
              style={{
                flexGrow: segment.days,
                flexBasis: 0,
                backgroundColor: segment.base
                  ? (trainingStatusZone(segment.base) ?? "var(--rule-soft)")
                  : "var(--rule-soft)",
              }}
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
