# Spec: Mini gráfico de barras semanal para Training hours / HIIT / Running

Roadmap: P4 — Dashboard personalizable. Cierra la sesión de mejoras de widgets de la rama `feat/dashboard-widgets-improvements`, extiende `docs/specs/app-dashboard-garmin-style-widgets.md`.
Estado: hecho

## Objetivo

Los tres widgets que comparan "esta semana vs. semana pasada" (Training hours, HIIT, Running) solo muestran un total y un `%` de variación. Después del fix de esta sesión a `findWeeklySummary` (comparar contra el mismo tramo transcurrido, no la semana completa — ver `docs/specs/app-dashboard-widgets-v2.md`, Notas de cierre Fase A), ese `%` es correcto pero sigue siendo una caja negra: no se ve **qué días** explican la diferencia. Se agrega un mini gráfico de barras (lunes a domingo de la semana en curso) debajo del valor+delta que ya muestra cada tile, en ember, alto proporcional a lo entrenado ese día (horas para Training hours/HIIT, km para Running).

Salida observable: las tres tiles muestran 7 barras con label de día debajo, y a simple vista se entiende qué días de la semana ya se entrenaron y cuáles faltan.

## Alcance

**Entra:**
- Desglose diario (lunes-domingo de la semana en curso) de duración y distancia, por usuario y opcionalmente por `sportType` — dato nuevo, no lo trae `findWeeklySummary` hoy (solo totales).
- Componente nuevo y reusable para las 3 tiles (regla de reuso de `apps/web/CLAUDE.md`: un patrón usado 2+ veces se saca a componente propio — acá se usa 3 veces desde el día uno, así que nace ya como componente, no se duplica primero).
- Tratamiento visual explícito para los días futuros de la semana en curso (miércoles a domingo, si hoy es martes): no pueden verse igual que "0 horas ese día", porque todavía no pasaron.

**No entra:**
- Comparar barra a barra contra la semana pasada (overlay de 2 semanas). Lo pedido es solo la semana actual; si hace falta comparar visualmente semana a semana es una iteración aparte.
- Cambiar la lógica del `%` vs. semana pasada que ya muestra cada tile (ya resuelta, este spec solo agrega el desglose diario debajo).
- Otros widgets: hoy solo estos 3 comparan semana a semana. Si aparece un cuarto a futuro, reusa el mismo componente sin cambios.
- Elegir automáticamente qué deportes tienen este chart: sigue siendo `weekly_hours` (fijo) + `MVP_SPORT_WIDGETS` (`running`, `hiit`, curados a mano en `registry.ts`) — no se toca ese curado acá.

## Diseño

### Dato: desglose diario dentro de `findWeeklySummary`

En vez de una función nueva con su propia query, se extiende `findWeeklySummary` (`packages/db/src/repositories/activities.ts`) para calcular el desglose diario en el mismo loop que ya arma `totalDurationSeconds`/`bySport` — la query ya trae todas las actividades de `[lastWeekStart, thisWeekEnd]`, no hace falta pegarle a la base dos veces.

Propuesta de forma (a confirmar en plan mode, no es la única razonable):

```ts
type WeekDay = {
  date: string; // YYYY-MM-DD, timezone del usuario
  dayOfWeek: number; // 0=lunes .. 6=domingo
  isFuture: boolean; // true si `date` es posterior a "hoy" en la timezone del usuario
  total: { durationSeconds: number; distanceMeters: number };
  bySport: Record<string, { durationSeconds: number; distanceMeters: number }>;
};

type WeeklySummary = {
  totalDurationSeconds: { thisWeek: number; lastWeek: number };
  bySport: Record<string, { thisWeek: WeeklySportBucket; lastWeek: WeeklySportBucket }>;
  weekDays: WeekDay[]; // 7 entradas, lunes a domingo de la semana EN CURSO (no la pasada)
};
```

`weekDays` siempre tiene 7 entradas (incluidos los días futuros, en 0) para que el componente no tenga que inferir cuántas barras dibujar — el `isFuture` es lo que decide cómo se pinta cada una, no la ausencia de la entrada.

### Componente: `WeeklyBarChart`

Nuevo, `apps/web/src/app/(app)/dashboard/_components/widgets/weekly-bar-chart.tsx` (junto a los widgets, no en `src/components/`: es específico de este patrón de comparación semanal, no un componente de marca general como `PairButton`).

Props propuestas:

```ts
{
  days: { label: string; value: number; isFuture: boolean }[]; // ya las 7, en orden lunes->domingo
}
```

- 7 barras verticales, gap chico, sin ejes ni grilla — mismo mark que "Mini-barras diarias" ya documentado en `docs/style.md` (Gráficos), **extendido acá con un label de día debajo de cada barra** (el original decía "sin ejes" a secas; se documenta la extensión en el mismo cambio que se implemente).
- Alto de cada barra proporcional al **máximo de esa semana** (no a una escala fija entre widgets — ver Preguntas abiertas, es una decisión real con trade-off).
- Color **ember**, no un hue de identidad nuevo — coincide con el resto de los sparklines que ya usa este dashboard (HRV, body battery, endurance score, recent activity, todos `stroke-ember`/`bg-ember`); no contradice la regla de exclusividad de ember (`docs/style.md`, "esto es lo que pair señala") porque ya es, de hecho, el hue que este dashboard usa para toda marca de dato en el tiempo dentro de una tile — se documenta esta lectura explícitamente para que quede claro que no es una excepción nueva, es el patrón ya establecido.
- Día futuro (`isFuture`): barra placeholder (contorno o `--rule-soft`, sin relleno ember) — se ve que ese día "todavía no pasó", no que "se entrenó cero". Encaja con lo aprendido en la sesión anterior sobre parcial-vs-completo (ver `docs/specs/app-dashboard-widgets-v2.md`): mismo cuidado, ahora también visual.
- Altura total del componente chica (barras + labels ~35-40px) — probado en vivo contra la tile en su ancho mínimo real (180px), mismo proceso que forzó el rediseño de las barras de Training load esta sesión (ese primer diseño desbordaba y no se detectó hasta probarlo en el navegador).

### Consumo por widget

- `weekly-hours.tsx`: `days` sale de `weekDays[i].total.durationSeconds` (segundos → horas para el alto de la barra).
- `weekly-distance.tsx` (HIIT/Running): sigue la misma rama que ya decide la unidad del valor principal (`bucket.thisWeek.distanceMeters === 0 ? duración : distancia`, ya implementado) — si el deporte se mide en duración (HIIT), `days` sale de `weekDays[i].bySport[sportType].durationSeconds`; si se mide en distancia (Running), de `weekDays[i].bySport[sportType].distanceMeters`. Nunca mezcla las dos unidades día a día dentro del mismo chart.

## Checklist de implementación

- [x] `findWeeklySummary`: agrega `weekDays` (misma forma propuesta arriba, sin cambios en plan mode).
- [x] `WeeklyBarChart` (componente nuevo, `weekly-bar-chart.tsx`).
- [x] `TileValue` extraído de `StatTile` (`stat-tile.tsx`) — no estaba en el plan original, pero agregar el bloque "valor + subtítulo" una tercera y cuarta vez a mano (weekly-hours, weekly-distance) cruzaba la regla de reuso de `apps/web/CLAUDE.md`; se sacó y se migró `training-load.tsx` en el mismo cambio.
- [x] `weekly-hours.tsx`: chart debajo del delta actual.
- [x] `weekly-distance.tsx`: mismo chart, unidad según la rama ya existente (duración/distancia).
- [x] `docs/style.md`: documentada la variante con label de día en "Mini-barras diarias".
- [x] Probado en vivo contra la tile en su ancho mínimo (180px) y contra el ancho normal.

## Preguntas abiertas

Todas resueltas:

- **Idioma de los labels de día**: inglés, `M T W T F S S`, tal cual pedido.
- **Escala del eje Y**: normalizada al máximo de esa semana (decisión de Franco, no techo fijo).
- **Tratamiento del día de hoy**: sin marca aparte — la distinción pasado/futuro (barra ember vs. placeholder punteado) alcanza; hoy es simplemente el último día no-futuro.
- **Nombre de `weekDays`**: se quedó dentro de `WeeklySummary`, tal cual la propuesta original.
