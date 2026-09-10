// Gauge de zona de docs/style.md, Graficos: variante de GaugeChart para una metrica con
// escala de zona conocida (readiness, VO2 max). A diferencia de GaugeChart (un solo arco
// de progreso, relleno monocromo), acá las 5 zonas están coloreadas a la vez — no hay
// "relleno", hay una escala fija con un marcador que indica dónde cae `value`.
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_DEGREES = 270;
// Empieza en 135° (medido en sentido horario desde las 3 en punto, convención nativa de
// stroke-dasharray de SVG) y barre 270° en sentido horario — deja el hueco de 90° centrado
// abajo, como un velocímetro.
const START_DEGREES = 135;
const SEGMENT_GAP_DEGREES = 3;
// Marcador circular con halo — excepción explícita a "marcas siempre cuadradas" de
// docs/style.md, Gráficos (documentada ahí, pedido directo de Franco viendo la referencia
// de Garmin). Radio mayor al medio-ancho del arco (8/2=4) para que se note como un punto
// propio, no un grosor más del trazo.
const MARKER_RADIUS = 6;
const MARKER_RING_RADIUS = 9;

export type ZoneGaugeZone = { upTo: number; color: string };

// Sin prop `square`: a diferencia de StatTile/TileShell, este componente no dibuja su
// propio fondo — siempre vive adentro de un TileShell, que ya resuelve grilla vs. página
// (grupo/hover activo o inerte). Mismo criterio que GaugeChart, que tampoco lo necesita.
export function ZoneGaugeChart({
  value,
  min,
  max,
  zones,
  label,
}: {
  value: number;
  min: number;
  max: number;
  zones: ZoneGaugeZone[];
  label: string;
}) {
  const totalRange = max - min;
  type Arc = { key: number; startDeg: number; segmentDeg: number; drawDeg: number; color: string };
  const arcs = zones.reduce<Arc[]>((acc, zone, i) => {
    const from = i === 0 ? min : Math.min(zones[i - 1]!.upTo, max);
    const to = Math.min(zone.upTo, max);
    const fraction = Math.max(to - from, 0) / totalRange;
    const segmentDeg = fraction * ARC_DEGREES;
    const drawDeg = Math.max(segmentDeg - SEGMENT_GAP_DEGREES, 0);
    const prev = acc[i - 1];
    const startDeg = prev ? prev.startDeg + prev.segmentDeg : START_DEGREES;
    acc.push({ key: i, startDeg, segmentDeg, drawDeg, color: zone.color });
    return acc;
  }, []);

  const clampedValue = Math.max(min, Math.min(max, value));
  const markerDeg = START_DEGREES + ((clampedValue - min) / totalRange) * ARC_DEGREES;
  const markerRad = (markerDeg * Math.PI) / 180;
  const markerX = 50 + RADIUS * Math.cos(markerRad);
  const markerY = 50 + RADIUS * Math.sin(markerRad);
  // Mismo color que la zona donde cae el valor — no --ink fijo, para que el marcador se
  // lea como parte de esa zona, no como un elemento aparte.
  const markerColor = (zones.find((zone) => clampedValue <= zone.upTo) ?? zones[zones.length - 1])!
    .color;

  return (
    <div className="flex flex-col items-center gap-2 pb-1">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(arc.drawDeg / 360) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              transform={`rotate(${arc.startDeg} 50 50)`}
              style={{ stroke: arc.color }}
            />
          ))}
          <circle cx={markerX} cy={markerY} r={MARKER_RADIUS} style={{ fill: markerColor }} />
          <circle
            cx={markerX}
            cy={markerY}
            r={MARKER_RING_RADIUS}
            fill="none"
            style={{ stroke: markerColor, strokeWidth: 1.5, strokeOpacity: 0.35 }}
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
