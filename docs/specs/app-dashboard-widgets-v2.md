# Spec: Dashboard widgets v2 — Activities al sidebar, tiles individuales, grilla cuadrada

Roadmap: P4 (Dashboard personalizable), nuevo ítem ("Dashboard widgets v2")
Estado: draft

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
- [ ] `/activities` (sidebar + página, lista completa)
- [ ] Separar `today_metrics` en 4 widgets independientes
- [ ] Separar `weekly_summary` en `weekly_hours` + widgets de distancia por deporte (dinámico)
- [ ] Widget `recent_activity`
- [ ] Grilla de 3 columnas, tiles cuadradas
- [ ] `/dashboard/metrics/[key]` con vista mínima por widget
- [ ] Probado en vivo: reordenar/ocultar cada tile por separado persiste; un usuario con `dashboard_layouts` viejo (keys de v1) no rompe, ve el layout nuevo por defecto

**Fase B** (bloqueada hasta que `garmin-daily-metrics` confirme datos)
- [ ] Revisar el catálogo confirmado por `garmin-daily-metrics` y decidir, dato por dato, cuáles entran como widget en esta pasada
- [ ] Un widget por cada dato que se decida incluir — mismo patrón de registro que Fase A (key + label + `render`), sin límite fijo de cantidad

## Preguntas abiertas

Formato exacto de la key compuesta para widgets por deporte (`weekly_distance:running` vs. una key separada tipo `weekly_distance_running`) y de su segmento de URL en `/dashboard/metrics/[key]` — se resuelve en el plan de implementación, no cambia el diseño de fondo.
