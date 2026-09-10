import type { ReactNode } from "react";
import { findRecentDailyMetrics, findTodayMetrics } from "@pair/db";
import { formatLabel } from "@/lib/format";
import { buildSparkline } from "@/lib/sparkline";
import { TileShell } from "./stat-tile";

const HISTORY_DAYS = 28;

// Barra de rango (docs/style.md, Gráficos): sin límites numéricos confirmados de Garmin
// para VFC, no se normaliza contra el min/max observado de un usuario — con solo ~2
// semanas de historial real, esa ventana es demasiado ruidosa (un valor "equilibrado" real
// terminaba viéndose al centro del rango solo por casualidad, encontrado en vivo). En vez
// de eso, la posición y el color salen directo de `hrvStatus` (el dato categórico que
// Garmin sí confirma, docs/garmin-api.md) — el marcador cae al centro del tramo de su
// propia categoría, del mismo color que ese tramo. Verde = equilibrado (el tramo más
// grande, centrado), no un tercio parejo — rojo solo en el extremo bajo (chico), naranjo a
// los dos lados del verde pero asimétrico: una franja chica antes del rojo, y una franja
// grande del lado alto (no hay rojo en el extremo alto — VFC alto no se marca como "mal"
// igual que bajo).
const RANGE_SEGMENTS = [
  { color: "var(--zone1)", weight: 10 }, // rojo — bajo
  { color: "var(--zone2)", weight: 15 }, // naranjo — transición baja
  { color: "var(--zone3)", weight: 45 }, // verde — equilibrado
  { color: "var(--zone2)", weight: 30 }, // naranjo — alto
];

// Espacio de valores confirmado hoy: LOW, UNBALANCED, BALANCED (docs/garmin-api.md, hrv.anon.json
// solo confirma UNBALANCED — LOW/BALANCED vistos en datos reales de esta sesión). Un status
// que no esté acá (ej. un "alto" que todavía no vimos) cae al tramo naranjo alto, no al centro.
const HRV_STATUS_SEGMENT: Record<string, number> = {
  LOW: 0,
  UNBALANCED: 1,
  BALANCED: 2,
};

function HrvRangeBar({ status }: { status: string }) {
  const segmentIndex = HRV_STATUS_SEGMENT[status] ?? RANGE_SEGMENTS.length - 1;
  const totalWeight = RANGE_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let cumulative = 0;
  for (let i = 0; i < segmentIndex; i++) {
    cumulative += RANGE_SEGMENTS[i]!.weight;
  }
  const segment = RANGE_SEGMENTS[segmentIndex]!;
  const percent = ((cumulative + segment.weight / 2) / totalWeight) * 100;

  return (
    <div className="relative h-2 w-full">
      <div className="flex h-full w-full gap-0.5">
        {RANGE_SEGMENTS.map((s, i) => (
          <div key={i} className="h-full" style={{ flex: s.weight, backgroundColor: s.color }} />
        ))}
      </div>
      {/* Halo del mismo color, semitransparente — mismo criterio que el anillo del
          marcador de ZoneGaugeChart (docs/style.md, Gráficos). */}
      <span
        aria-hidden
        className="absolute top-1/2 h-5 w-2.5 -translate-x-1/2 -translate-y-1/2 opacity-35"
        style={{ left: `${percent}%`, backgroundColor: segment.color }}
      />
      <span
        aria-hidden
        className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${percent}%`, backgroundColor: segment.color }}
      />
    </div>
  );
}

export async function renderHrv(userId: string, square = true): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  if (!today) return null;

  const value = today.hrvLastNightAvg;
  if (value == null) return null;

  const status = today.hrvStatus ? formatLabel(today.hrvStatus) : null;
  const weeklyAvg = today.hrvWeeklyAvg;

  const history = await findRecentDailyMetrics(userId, HISTORY_DAYS);
  const sparkline = buildSparkline(history.map((row) => row.hrvLastNightAvg ?? null));

  return (
    <TileShell label="HRV" square={square}>
      <div className="flex items-baseline gap-2">
        <p className="font-display text-[32px] leading-none tracking-[-0.03em] text-ink transition-colors duration-[250ms] group-hover:text-bone">
          {value}
          <span className="ml-0.5 text-sm font-medium text-graphite">ms</span>
        </p>
        {status && (
          <p className="font-mono text-xs text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
            {status}
          </p>
        )}
      </div>
      {weeklyAvg != null && today.hrvStatus && (
        <div className="mt-2">
          <p className="mb-1.5 font-mono text-[10.5px] text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
            {weeklyAvg}ms · 7-day avg
          </p>
          <HrvRangeBar status={today.hrvStatus} />
        </div>
      )}
      {sparkline && (
        <div className="mt-3">
          <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
            Last 4 weeks
          </p>
          <div className="relative h-7">
            <svg
              viewBox="0 0 100 28"
              preserveAspectRatio="none"
              className="block h-7 w-full overflow-visible"
            >
              <path
                d={sparkline.path}
                fill="none"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-ember opacity-70"
              />
            </svg>
            <span
              aria-hidden
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-ember"
              style={{
                left: `${sparkline.lastPoint.xPercent}%`,
                top: `${sparkline.lastPoint.yPercent}%`,
              }}
            />
          </div>
        </div>
      )}
    </TileShell>
  );
}
