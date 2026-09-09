import type { ReactNode } from "react";
import type { Sparkline } from "@/lib/sparkline";

// Marco compartido de una tile: fondo, hover, label arriba. `StatTile` lo usa por dentro
// para su anatomía fija (label/valor/delta/sparkline); widgets con contenido propio (sleep
// phases, training load) lo usan directo con children. `square` (default `true`) recorta a
// `aspect-square` para la grilla del dashboard; en `false` (vista de detalle de
// `/dashboard/metrics/[key]`) es un bloque de ancho libre con el mismo fondo/hover/label.
export function TileShell({
  label,
  flagged = false,
  square = true,
  children,
}: {
  label: string;
  flagged?: boolean;
  square?: boolean;
  children: ReactNode;
}) {
  const labelEl = (
    <p
      className={`mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors duration-[250ms] ${
        flagged ? "text-panel-muted" : "text-graphite group-hover:text-panel-muted"
      }`}
    >
      {label}
    </p>
  );

  if (square) {
    return (
      <div
        className={`group relative flex aspect-square flex-col overflow-hidden p-5 transition-colors duration-[250ms] ${
          flagged ? "bg-panel" : "bg-lcd hover:bg-panel"
        }`}
      >
        {labelEl}
        {children}
      </div>
    );
  }

  // Vista de detalle (/dashboard/metrics/[key]): ya es el destino, no hay a dónde llevar —
  // sin `group`/`hover:bg-panel`, nada debería reaccionar al mouse acá.
  return (
    <div className={`relative p-5 ${flagged ? "bg-panel" : "bg-lcd"}`}>
      {labelEl}
      {children}
    </div>
  );
}

// `flagged`: la unica tile por vista en la que pair esta comentando algo; ahi el delta pasa a ember.
export function StatTile({
  label,
  value,
  unit,
  delta,
  flagged = false,
  sparkline,
  square = false,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  flagged?: boolean;
  sparkline?: Sparkline | null;
  square?: boolean;
}) {
  const content = (
    <>
      <p
        className={`font-display mb-1.5 text-[32px] leading-none tracking-[-0.03em] transition-colors duration-[250ms] ${
          flagged ? "text-bone" : "text-ink group-hover:text-bone"
        }`}
      >
        {value}
        {unit && <span className="ml-0.5 text-sm font-medium text-graphite">{unit}</span>}
      </p>

      <p className={`mb-3.5 font-mono text-xs ${flagged ? "text-ember" : "text-graphite"}`}>
        {delta}
      </p>

      {sparkline && (
        <div className={`relative h-7 ${square ? "mt-auto" : "mt-1.5"}`}>
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
              className={
                flagged
                  ? "stroke-panel-muted"
                  : "stroke-graphite opacity-70 transition-colors duration-[250ms] group-hover:stroke-panel-muted"
              }
            />
          </svg>
          <span
            aria-hidden
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${
              flagged ? "h-2.5 w-2.5 bg-ember" : "h-2 w-2 bg-graphite group-hover:bg-panel-muted"
            }`}
            style={{
              left: `${sparkline.lastPoint.xPercent}%`,
              top: `${sparkline.lastPoint.yPercent}%`,
            }}
          />
        </div>
      )}
    </>
  );

  if (square) {
    return (
      <TileShell label={label} flagged={flagged}>
        {content}
      </TileShell>
    );
  }

  // Vista de detalle (/dashboard/metrics/[key]): ya es el destino, no hay a dónde llevar —
  // sin `group`/`hover:bg-panel`, nada debería reaccionar al mouse acá.
  return (
    <div className={`relative px-5 pt-5 pb-0 ${flagged ? "bg-panel" : "bg-lcd"}`}>
      <p
        className={`mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] ${flagged ? "text-panel-muted" : "text-graphite"}`}
      >
        {label}
      </p>
      {content}
    </div>
  );
}
