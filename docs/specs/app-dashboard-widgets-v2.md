# Spec: Dashboard widgets v2 — Activities al sidebar, tiles individuales, grilla cuadrada

Roadmap: P4 (Dashboard personalizable), nuevo ítem ("Dashboard widgets v2")
Estado: hecho

## Objetivo

Que cada tile de métrica sea su propio widget independiente (reordenable/ocultable por separado), no una tile más dentro de un widget grande. Que "This week" compare lo comparable (km de un mismo deporte entre sí, horas de entrenamiento en general) en vez de mezclar km de deportes distintos. Que "Recent activities" salga del sistema de widgets (son demasiadas para una tile) y pase a ser su propia sección del sidebar. Construido sobre `ui-component-library` y `dashboard-visualization-system`.

Salida observable: el sidebar tiene un ítem "Activities" con la lista completa; `/dashboard` muestra una grilla de tiles cuadradas, 3 por fila, cada una reordenable/ocultable por separado desde `/dashboard/widgets`; cada tile linkea a una ruta propia con la misma data que ya muestra (sin profundidad nueva todavía).

## Alcance

**Entra (Fase A, no depende de datos nuevos de Garmin)**:
- `/activities`: ruta nueva en el sidebar, lista completa de actividades (reusa `findRecentActivities`, sin paginación real todavía — un límite alto alcanza para el volumen actual; se revisa si se vuelve un problema real).
- `today_metrics` se separa en 4 widgets (`steps`, `resting_hr`, `sleep`, `body_battery`).
- `weekly_summary` se separa en un widget de horas totales (`weekly_hours`, todos los deportes) + un widget de distancia por deporte, uno por cada tipo de deporte que el usuario realmente tiene en sus actividades recientes (no una lista fija hardcodeada).
- Widget nuevo `recent_activity` (la actividad más reciente, una sola — reusa `findRecentActivities(userId, 1)`, no hace falta repository nuevo).
- Grilla de `DashboardLayoutEditor` pasa de 2 a 3 columnas, tiles cuadradas (`aspect-ratio: 1`, ver `dashboard-visualization-system`).
- Cada widget linkea a `/dashboard/metrics/[key]`, vista mínima: mismos datos que ya muestra la tile, nada más. **El diseño real de esa vista es spec aparte, todavía no.**

**Entra (Fase B, depende de `garmin-daily-metrics`)**: un widget por cada dato que ese spec confirme como disponible — el objetivo es un catálogo grande, no un número fijo. La gracia del dashboard configurable es que el usuario elige qué mostrar de todo lo que exista, no que nosotros decidamos de antemano cuáles seis entran. `garmin-daily-metrics` investiga primero qué se puede traer (bienestar diario + reportes históricos); recién con eso confirmado se decide, dato por dato, cuál vale la pena convertir en widget ahora y cuál queda documentado para más adelante.

**No entra** (diferido, no es una omisión):
- Diseño real de las vistas de detalle por métrica (`/dashboard/metrics/[key]`): spec futuro, separado, a pedido tuyo.
- Paginación real de `/activities`: se agrega si el volumen lo pide.
- Filtro de `/activities` por deporte/fecha: fuera de alcance por ahora.
- Cualquier gráfico nuevo de `dashboard-visualization-system` que Fase B necesite antes de que ese spec esté implementado: Fase B no arranca hasta que `garmin-daily-metrics` y `dashboard-visualization-system` estén listos.

## Diseño

- **`WIDGET_REGISTRY` deja de ser un `Record` puramente estático para las tiles de "This week" por deporte**: hoy es `Record<WidgetKey, {...}>` con `WidgetKey` como unión fija de strings (`packages/db/CLAUDE.md`/`app-dashboard-widgets.md`). Los widgets de deporte necesitan una key compuesta (ej. `weekly_distance:running`), calculada en tiempo de render a partir de los deportes que aparecen de verdad en las actividades recientes del usuario — no una lista fija de deportes hardcodeada (un usuario que solo corre no debería ver una tile vacía de "Cycling"). El resto de los widgets (`steps`, `resting_hr`, `sleep`, `body_battery`, `weekly_hours`, `recent_activity`) siguen siendo keys fijas, sin cambio de patrón.
- **Compatibilidad con `dashboard_layouts` existente, gratis**: el código ya filtra `layout.filter((w) => w.key in WIDGET_REGISTRY)` (`dashboard/page.tsx`) — una key vieja como `recent_activities` o `today_metrics` que ya no exista en el registry simplemente se ignora, sin necesitar una migración de datos. Los usuarios existentes ven el layout por defecto nuevo la primera vez, como si nunca hubieran tenido `dashboard_layouts` (mismo camino que ya maneja `getEffectiveLayout`).
- **`recent_activity` reusa `findRecentActivities(userId, 1)`**, ya existe — no hace falta una función de repository nueva para esta Fase A.
- **`/activities` reusa el mismo `findRecentActivities`** con un límite mayor, no una query nueva.
- **Grilla**: `grid-template-columns: repeat(3, minmax(0, 1fr))`, cada `StatTile` con `aspect-ratio: 1` (ajuste de espaciado interno propio de `dashboard-visualization-system`, no se rediseña acá).
- **Ruta de detalle mínima**: `/dashboard/metrics/[key]/page.tsx`, misma capa Server Component que ya usa `/activities/[garminActivityId]`, renderiza el mismo dato que ya calcula el widget (se factoriza esa lógica para no calcularla dos veces, no se duplica el query).

## Checklist de implementación

**Fase A**
- [x] `/activities` (sidebar + página, lista completa)
- [x] Separar `today_metrics` en 4 widgets independientes
- [x] Separar `weekly_summary` en `weekly_hours` + widgets de distancia por deporte (dinámico)
- [x] Widget `recent_activity`
- [x] Grilla de 3 columnas, tiles cuadradas
- [x] `/dashboard/metrics/[key]` con vista mínima por widget
- [x] Probado en vivo: reordenar/ocultar cada tile por separado persiste; un usuario con `dashboard_layouts` viejo (keys de v1) no rompe, ve el layout nuevo por defecto

**Fase B**
- [x] Revisar el catálogo confirmado por `garmin-daily-metrics` y decidir, dato por dato, cuáles entran como widget en esta pasada
- [x] Un widget por cada dato incluido — 17 widgets nuevos, mismo patrón de registro que Fase A (key + label + `render`)

## Preguntas abiertas

Resuelto en el plan de implementación: la key compuesta es `weekly_distance:<sport>` (dos puntos), válida sin escapar como segmento de URL (`:` es un carácter válido en un `pchar` de la RFC 3986); el link a `/dashboard/metrics/[key]` igual la pasa por `encodeURIComponent` por prolijidad.

## Notas de cierre (Fase A)

- **Bug preexistente encontrado y arreglado** (no introducido por este cambio, pero se volvió mucho más visible con los widgets nuevos): `findWeeklySummary` calculaba `lastWeekEnd` como `now - 7 días` (un instante puntual) en vez del fin de la semana calendario pasada, así que cualquier actividad de la semana pasada fuera de esa franja angosta (la mayoría, cualquier día que no sea el mismo día-y-hora de hace una semana) no caía ni en "esta semana" ni en "semana pasada" — se perdía en silencio. Se arregló en el mismo archivo que ya tocaba este spec (`packages/db/src/repositories/activities.ts`): como el `WHERE` ya acota las filas a `[lastWeekStart, thisWeekEnd]`, cualquier fila que no sea "esta semana" es necesariamente "semana pasada completa", sin necesitar un segundo límite.
- **`getEffectiveLayout` se generalizó** más allá de lo descrito en el plan original: no solo devuelve el default cuando no hay fila guardada, sino que siempre mezcla lo guardado con el set actual de `getWidgetEntries` — cualquier key guardada que ya no exista se ignora, y cualquier widget que el usuario no tiene guardado (layout viejo con solo keys v1, o un widget agregado después de su último guardado) aparece visible por default. Encontrado probando en vivo el caso "usuario con layout v1": con el diseño original del plan, un layout que solo tenía keys viejas quedaba con la grilla completamente vacía en vez de mostrar el default nuevo.
- **Hallazgo no arreglado, fuera de alcance**: un warning de hidratación de React en `aria-describedby="DndDescribedBy-N"` de `dnd-kit` (`useSortable`), visible como el badge "1 Issue" del overlay de Next dev — el contador de IDs que genera esa librería difiere entre el render de servidor y el de cliente. Es preexistente (el drag-and-drop ya existía en v1, antes de esta sesión), no afecta la función (reordenar/ocultar/persistir probado en vivo, funciona), y arreglarlo es trabajo aparte sobre `dnd-kit`, no de este spec.

## Notas de cierre (Fase B)

- **17 widgets nuevos** a partir del catálogo que confirmó `garmin-daily-metrics`: SpO2, Respiration, Hill score, Endurance score, VO2 Max Running, VO2 Max Cycling, Altitude acclimation, Weight, BMI (columnas simples, mismo patrón `renderMetric` que ya tenía `daily-metrics.tsx`), HRV, Training status (forma propia — delta/valor no numéricos), Training load (ACWR — resuelve el ítem de roadmap "métricas derivadas propias" que se sacó del mapa, Garmin ya lo calcula), Sleep score, Readiness, Stress, Heat acclimation (gauges), Sleep phases (`SleepPhaseBar`). No entró `loadBalanceFeedback` (foco de carga): el texto que devuelve Garmin es más párrafo que valor de tile, no encaja en la anatomía actual — queda documentado, no es un widget roto.
- **`TileShell` nuevo** (`stat-tile.tsx`): se extrajo el marco de una tile cuadrada (fondo/hover/label) para que widgets con contenido propio (Sleep phases, Training load, Training status) lo usen sin duplicar la estructura de `StatTile`.
- **`GaugeChart` tenía un bug real, encontrado al conectar el primer consumidor real**: usaba colores calibrados para superficie oscura (`text-bone`, `text-panel-muted`, pista `rgba(239,241,235,0.12)`) pese a que su propia spec en `docs/style.md` decía "graphite por defecto, mismo criterio que las stat tiles" (superficie clara). Se corrigió el componente para que coincida con su propia documentación, en vez de envolverlo en una superficie oscura artificial.
- **`SleepPhaseBar` tenía el mismo bug que `GaugeChart`**: colores hardcodeados a superficie oscura (`bg-panel`, `text-panel-muted`) sin variante de hover, así que el widget quedaba oscuro siempre en vez de invertir con el resto de la tile. Se corrigió para seguir el mismo patrón `group-hover:` que cualquier otra tile (fondo claro por defecto, invierte en hover) — `docs/style.md` también se actualizó para no asumir `--panel` fijo.
- **`training-status.tsx` y `training-load.tsx` tenían el mismo bug, más sutil**: su tipografía propia (fuera de `StatTile`/`GaugeChart`) copió los valores de color (`text-ink`, `text-graphite`) pero no las variantes `group-hover:`, así que el texto quedaba casi invisible en hover (`--ink` y `--panel` son casi el mismo negro). Se agregaron las variantes de hover que faltaban.
- **Tope de 15 widgets visibles** (`MAX_VISIBLE_WIDGETS` en `registry.ts`): sin paginación todavía, una cuenta con muchos widgets activados fuerza scroll interno en el dashboard. `getEffectiveLayout` lo aplica en la lectura (corrige también cuentas que ya tenían más de 15 antes de que existiera el tope, sin reescribir lo guardado), `toggleWidgetVisibility` lo respeta al togglear, y `/dashboard/widgets` muestra un aviso "X/15 widgets visible".
- **Margen inferior del label de `GaugeChart` casi cortado**: el círculo + label podían acercarse al borde inferior de la tile con `overflow-hidden`. Se achicó el círculo (112px → 96px) y se agregó `pb-1` al wrapper para dejar aire garantizado.
- **Bug real en la primera versión de los widgets de forma propia**: usaban `findRecentDailyMetrics(userId, 1)` asumiendo que devolvía "el día de hoy" — en realidad ese repositorio filtra por *fecha de corte* (`date >= hoy - N días`), no por cantidad de filas, así que con `N=1` podía devolver una fila vieja o ninguna según el reloj. Ya existía `findTodayMetrics(userId)`, hecho a propósito para esto — se corrigieron los 8 archivos para usarlo.
- **`StatTile` con texto largo desborda**: `trainingStatusPhrase` ("Strained 1") es texto, no un número corto, y el tamaño fijo de 32px de `StatTile` lo desbordaba. El widget de Training status pasó a `TileShell` con tipografía propia más chica y wrap, en vez de forzarlo por `StatTile`.
- **`formatSportType` se generalizó a `formatLabel`** (`lib/format.ts`): la misma prettificación de texto tipo enum de Garmin ("STRAINED_1" → "Strained 1") hacía falta para frases de estado, no solo deportes — mismo cuerpo, nombre genérico, sin traducir a mano ningún valor (no tenemos la lista completa que Garmin puede devolver).
- Probado con ~38 widgets visibles a la vez (23 fijos + deportes de la semana): la grilla responsive de Fase A cae al piso de 180px y al scroll interno sin cambios — el mecanismo ya soportaba esta escala.
