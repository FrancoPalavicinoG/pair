export type SparklinePoint = { xPercent: number; yPercent: number };

export type Sparkline = {
  /** Atributo "d" de un <path> dentro de <svg viewBox="0 0 100 28">. */
  path: string;
  /** Posicion en % del ultimo punto: va como <span> HTML sobre el SVG, no adentro (docs/style.md, Gotchas tecnicos). */
  lastPoint: SparklinePoint;
};

const VIEWBOX_HEIGHT = 28;

/** Serie (mas vieja -> mas nueva, `null` = sin dato) a sparkline. `null` si quedan menos de 2 puntos. */
export function buildSparkline(values: (number | null)[]): Sparkline | null {
  const points = values.filter((v): v is number => v !== null);
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min;

  const coords = points.map((value, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = range === 0 ? VIEWBOX_HEIGHT / 2 : VIEWBOX_HEIGHT - ((value - min) / range) * VIEWBOX_HEIGHT;
    return { x, y };
  });

  const path = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const last = coords[coords.length - 1];
  if (!last) return null; // inalcanzable: points.length >= 2 ya lo garantiza

  return {
    path,
    lastPoint: { xPercent: last.x, yPercent: (last.y / VIEWBOX_HEIGHT) * 100 },
  };
}
