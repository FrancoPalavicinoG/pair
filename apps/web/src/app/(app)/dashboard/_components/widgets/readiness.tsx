import type { ReactNode } from "react";
import { findReadinessFactors } from "@pair/db";
import { formatLabel } from "@/lib/format";
import { TileShell } from "./stat-tile";
import { ZoneGaugeChart, type ZoneGaugeZone } from "@/components/zone-gauge-chart";

// Cortes definidos por Franco: el tope (Óptimo) queda angosto (ultimos 10 puntos), el
// resto se reparte parejo entre las 4 zonas restantes (docs/specs/app-dashboard-garmin-style-widgets.md).
const READINESS_ZONES: ZoneGaugeZone[] = [
  { upTo: 22, color: "var(--zone1)" },
  { upTo: 45, color: "var(--zone2)" },
  { upTo: 67, color: "var(--zone3)" },
  { upTo: 90, color: "var(--zone4)" },
  { upTo: 100, color: "var(--zone5)" },
];

const FACTOR_LABELS = [
  { key: "sleep", label: "Sleep" },
  { key: "sleepHistory", label: "Recent sleep" },
  { key: "hrv", label: "HRV status" },
  { key: "acwr", label: "Acute load" },
  { key: "recoveryTime", label: "Recovery" },
  { key: "stressHistory", label: "Recent stress" },
] as const;

export async function renderReadiness(userId: string, square = true): Promise<ReactNode> {
  const factors = await findReadinessFactors(userId);
  if (factors?.score == null) return null;

  const level = factors.level ? formatLabel(factors.level) : "—";
  const subtitle = factors.feedbackShort;

  const factorRows = FACTOR_LABELS.flatMap(({ key, label }) => {
    const value = factors[key];
    return value != null ? [{ label, value }] : [];
  });

  return (
    <TileShell label="Readiness" square={square}>
      <ZoneGaugeChart
        value={factors.score}
        min={0}
        max={100}
        zones={READINESS_ZONES}
        label={level}
      />
      {!square && (
        <>
          {subtitle && (
            <p className="mt-1 text-center text-sm text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
              {formatLabel(subtitle)}
            </p>
          )}
          {factorRows.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-rule-soft pt-4">
              {factorRows.map((row) => (
                <div key={row.label}>
                  <p className="font-display text-sm text-ink transition-colors duration-[250ms] group-hover:text-bone">
                    {formatLabel(row.value)}
                  </p>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
                    {row.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </TileShell>
  );
}
