import type { ReactNode } from "react";
import { findLoadBalance, findTodayMetrics, type LoadBalanceBucket } from "@pair/db";
import { TileShell, TileValue } from "./stat-tile";

// Labels abreviados para que entren sin truncar en la tile mínima (180px, w-16 de columna
// fija) — "Aerobic high/low" completo no entra a este tamaño de fuente.
const LOAD_BALANCE_ROWS: { key: keyof LoadBalanceRows; label: string }[] = [
  { key: "anaerobic", label: "Anaerobic" },
  { key: "aerobicHigh", label: "Aerobic hi" },
  { key: "aerobicLow", label: "Aerobic lo" },
];

type LoadBalanceRows = { anaerobic: LoadBalanceBucket | null; aerobicHigh: LoadBalanceBucket | null; aerobicLow: LoadBalanceBucket | null };

// Barra de rango con objetivo (docs/style.md, Gráficos): a diferencia de la "barra de rango"
// existente (HRV, un tramo categórico fijo por status), acá el objetivo es un rango numérico
// propio por bucket (targetMin-targetMax) — la banda resaltada es ese rango dentro de la
// escala [0, valor o target más alto], y el marcador cae en el valor real. Verde = dentro del
// objetivo, naranjo = por debajo o por encima (mismo hue de "atención" que ya usa el resto
// del sistema de zona, sin agregar un color nuevo).
function LoadBalanceRow({ label, bucket }: { label: string; bucket: LoadBalanceBucket }) {
  // Piso de 1 para no dividir por cero si Garmin todavía no calculó un target (cuenta nueva:
  // targetMax y value pueden llegar los dos en 0).
  const scaleMax = Math.max(bucket.targetMax, bucket.value, 1) * 1.05;
  const targetStartPercent = (bucket.targetMin / scaleMax) * 100;
  const targetWidthPercent = ((bucket.targetMax - bucket.targetMin) / scaleMax) * 100;
  const valuePercent = (bucket.value / scaleMax) * 100;
  const inRange = bucket.value >= bucket.targetMin && bucket.value <= bucket.targetMax;
  const markerColor = inRange ? "var(--zone3)" : "var(--zone2)";

  // Label + barra + valor en una sola línea (no label arriba, barra abajo): 3 buckets ya
  // compiten por poco alto en la tile mínima (180px) junto con el ACWR y el acute/chronic
  // que ya ocupaba el widget — una fila por bucket en vez de dos es lo que entra sin
  // desbordar (probado en vivo contra la tile en su ancho mínimo real).
  return (
    <div className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.04em] text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
      <span className="w-16 shrink-0">{label}</span>
      <div className="relative h-1 flex-1 bg-rule-soft">
        <span
          aria-hidden
          className="absolute h-full"
          style={{
            left: `${targetStartPercent}%`,
            width: `${targetWidthPercent}%`,
            backgroundColor: "var(--zone3)",
          }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 h-2 w-[3px] -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${valuePercent}%`, backgroundColor: markerColor }}
        />
      </div>
      <span className="w-6 shrink-0 text-right normal-case">{Math.round(bucket.value)}</span>
    </div>
  );
}

// Garmin ya calcula ACWR (docs/garmin-api.md) — se trae el número, no se deriva acá.
export async function renderTrainingLoad(userId: string, square = true): Promise<ReactNode> {
  const today = await findTodayMetrics(userId);
  const acwr = today?.acwr;
  if (acwr == null) return null;

  const loadBalance = await findLoadBalance(userId);

  return (
    <TileShell label="Training load" square={square}>
      <TileValue
        value={acwr.toFixed(1)}
        subtitle={`${today?.acuteLoad ?? "–"} acute / ${today?.chronicLoad ?? "–"} chronic`}
        tightSubtitle
      />
      {loadBalance && (
        <div className="mt-1.5 space-y-1 border-t border-rule-soft pt-1.5">
          {LOAD_BALANCE_ROWS.map(({ key, label }) => {
            const bucket = loadBalance[key];
            return bucket ? <LoadBalanceRow key={key} label={label} bucket={bucket} /> : null;
          })}
        </div>
      )}
    </TileShell>
  );
}
