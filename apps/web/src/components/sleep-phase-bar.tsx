import type { SleepStage, SleepStageSegment } from "@pair/core";
import { formatClockTime } from "@/lib/format";

// Timeline cronológico de docs/style.md, Gráficos: a diferencia de una barra apilada por
// proporción, acá el orden y el ancho de cada segmento son el orden y la duración reales
// de la noche — sin gap entre segmentos (con 15-25 por noche, un separador en cada uno se
// ve como rayado, no como una línea de tiempo continua; Garmin tampoco lo tiene).
const STAGE_COLOR: Record<SleepStage, string> = {
  awake: "var(--sleep1)",
  light: "var(--sleep2)",
  rem: "var(--sleep3)",
  deep: "var(--sleep4)",
};

const LEGEND: { stage: SleepStage; label: string }[] = [
  { stage: "awake", label: "Awake" },
  { stage: "light", label: "Light" },
  { stage: "rem", label: "REM" },
  { stage: "deep", label: "Deep" },
];

export function SleepPhaseBar({ segments }: { segments: SleepStageSegment[] }) {
  const windowStart = new Date(segments[0]!.startLocal).getTime();
  const windowEnd = new Date(segments[segments.length - 1]!.endLocal).getTime();
  const windowMs = windowEnd - windowStart;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between font-mono text-[10.5px] text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted">
        <span>{formatClockTime(segments[0]!.startLocal)}</span>
        <span>{formatClockTime(segments[segments.length - 1]!.endLocal)}</span>
      </div>
      <div className="flex h-8 bg-lcd transition-colors duration-[250ms] group-hover:bg-panel">
        {segments.map((segment, i) => {
          const durationMs = new Date(segment.endLocal).getTime() - new Date(segment.startLocal).getTime();
          if (windowMs <= 0 || durationMs <= 0) return null;
          return (
            <div
              key={i}
              style={{ width: `${(durationMs / windowMs) * 100}%`, backgroundColor: STAGE_COLOR[segment.stage] }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {LEGEND.map((entry) => (
          <span
            key={entry.stage}
            className="flex items-center gap-1.5 font-mono text-[10.5px] text-graphite transition-colors duration-[250ms] group-hover:text-panel-muted"
          >
            <i aria-hidden className="block h-2 w-2" style={{ backgroundColor: STAGE_COLOR[entry.stage] }} />
            {entry.label}
          </span>
        ))}
      </div>
    </div>
  );
}
