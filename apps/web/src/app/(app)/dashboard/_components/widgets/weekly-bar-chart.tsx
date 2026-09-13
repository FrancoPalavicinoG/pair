// Mini-barras diarias (docs/style.md, Gráficos): barra corta por día, sin ejes, un hue de
// identidad — acá extendido con un label de día debajo de cada barra (documentado en el mismo
// cambio). Ember porque ya es el hue que este dashboard usa para toda marca de dato en el
// tiempo dentro de una tile (HRV, body battery, endurance score, recent activity).
export type WeeklyBarChartDay = { dayOfWeek: number; value: number; isFuture: boolean; isToday: boolean };

// Lunes -> domingo, iniciales en inglés con las repeticiones de martes/jueves y sábado/domingo
// — pedido así a propósito, se lee por posición, no por letra única.
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function WeeklyBarChart({ days }: { days: WeeklyBarChartDay[] }) {
  const max = Math.max(...days.map((day) => day.value), 1);

  return (
    <div className="mt-2 flex items-end gap-1 border-t border-rule-soft pt-2">
      {days.map((day) => (
        <div key={day.dayOfWeek} className="flex flex-1 flex-col items-center gap-1">
          <div className="relative h-7 w-full">
            {day.isFuture ? (
              // Día que todavía no pasó: placeholder punteado, no "0 horas" — un valor real en
              // 0 y un día futuro no pueden verse igual.
              <span aria-hidden className="absolute inset-0 rounded-[1px] border border-dashed border-rule" />
            ) : (
              <span
                aria-hidden
                className="absolute bottom-0 w-full rounded-[1px] bg-ember"
                style={{ height: `${day.value > 0 ? Math.max((day.value / max) * 100, 6) : 2}%` }}
              />
            )}
          </div>
          <span
            className={`font-mono text-[8.5px] uppercase transition-colors duration-[250ms] ${
              day.isToday
                ? "font-medium text-ink group-hover:text-bone"
                : "text-graphite group-hover:text-panel-muted"
            }`}
          >
            {WEEKDAY_LABELS[day.dayOfWeek]}
          </span>
        </div>
      ))}
    </div>
  );
}
