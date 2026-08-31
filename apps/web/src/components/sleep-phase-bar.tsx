// Barra de fases de sueno de docs/style.md, Graficos: timeline categorico,
// gap de 2px de --panel entre segmentos (no un borde), leyenda swatch+label.
const PHASES = [
  { key: "awake", label: "Awake", color: "var(--sleep1)" },
  { key: "light", label: "Light", color: "var(--sleep2)" },
  { key: "rem", label: "REM", color: "var(--sleep3)" },
  { key: "deep", label: "Deep", color: "var(--sleep4)" },
] as const;

export type SleepPhases = { awake: number; light: number; rem: number; deep: number };

export function SleepPhaseBar({ phases }: { phases: SleepPhases }) {
  const total = phases.awake + phases.light + phases.rem + phases.deep;

  return (
    <div>
      <div className="flex h-8 gap-0.5 bg-panel">
        {PHASES.map((phase) => {
          const seconds = phases[phase.key];
          if (total <= 0 || seconds <= 0) return null;
          return (
            <div
              key={phase.key}
              style={{ width: `${(seconds / total) * 100}%`, backgroundColor: phase.color }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {PHASES.map((phase) => (
          <span
            key={phase.key}
            className="flex items-center gap-1.5 font-mono text-[10.5px] text-panel-muted"
          >
            <i aria-hidden className="block h-2 w-2" style={{ backgroundColor: phase.color }} />
            {phase.label}
          </span>
        ))}
      </div>
    </div>
  );
}
