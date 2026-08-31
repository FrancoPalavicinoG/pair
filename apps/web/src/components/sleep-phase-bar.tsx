// Barra de fases de sueno de docs/style.md, Graficos: timeline categorico,
// gap de 2px del color de superficie de la tile entre segmentos (no un borde) —
// fondo claro por defecto, invierte a --panel en hover igual que el resto de la
// tile (no una superficie oscura fija). Leyenda swatch+label, mismo criterio.
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
      <div className="flex h-8 gap-0.5 bg-lcd transition-colors duration-[250ms] group-hover:bg-panel">
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
            className="flex items-center gap-1.5 font-mono text-[10.5px] text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted"
          >
            <i aria-hidden className="block h-2 w-2" style={{ backgroundColor: phase.color }} />
            {phase.label}
          </span>
        ))}
      </div>
    </div>
  );
}
