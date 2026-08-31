// Gauge circular de docs/style.md, Graficos. Fondo claro por defecto de una tile (mismo
// criterio que StatTile: valor en --ink, label en --graphite), invierte a superficie
// oscura en hover igual que el resto de una tile (--bone/--panel-muted) — no una
// superficie oscura fija. `color` default graphite (clase, responde a hover); si la
// metrica tiene su propia escala de zona, quien lo use pasa un color explicito (no
// responde a hover — decision del que lo usa, no de este componente).
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function GaugeChart({
  value,
  max,
  label,
  color,
}: {
  value: number;
  max: number;
  label: string;
  color?: string;
}) {
  const progress = Math.max(0, Math.min(1, value / max));
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-2 pb-1">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--rule-soft)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            {...(color
              ? { stroke: color }
              : { className: "stroke-graphite transition-colors duration-[250ms] group-hover:stroke-panel-muted" })}
          />
        </svg>
        <span className="font-display absolute inset-0 flex items-center justify-center text-2xl leading-none tracking-[-0.03em] text-ink transition-colors duration-[250ms] group-hover:text-bone">
          {value}
        </span>
      </div>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
        {label}
      </p>
    </div>
  );
}
