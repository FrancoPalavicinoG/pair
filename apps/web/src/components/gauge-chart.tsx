// Gauge circular de docs/style.md, Graficos. Vive sobre --panel (mismo criterio
// que el resto de los tipos de marca). `color` default graphite/panel-muted
// (monocromo); si la metrica tiene su propia escala de zona, quien lo use pasa
// ese color — este componente no decide cual.
const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function GaugeChart({
  value,
  max,
  label,
  color = "var(--panel-muted)",
}: {
  value: number;
  max: number;
  label: string;
  color?: string;
}) {
  const progress = Math.max(0, Math.min(1, value / max));
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="rgba(239,241,235,0.12)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="font-display absolute inset-0 flex items-center justify-center text-[28px] leading-none tracking-[-0.03em] text-bone">
          {value}
        </span>
      </div>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-panel-muted">{label}</p>
    </div>
  );
}
