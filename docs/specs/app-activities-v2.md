<!-- Nombre de archivo: <área>-<feature>.md, por lo que hace, no por la fase del roadmap. -->

# Spec: Activities v2 — agrupación por fecha, íconos por categoría, filtros

Roadmap: refinamiento de P4 sobre superficie ya shippeada (`app-dashboard-widgets-v2.md` movió Activities a su propia ruta `/activities`; este spec no agrega un ítem nuevo al checklist de `docs/roadmap.md`, es "pequeños fix y refactors" sobre lo ya construido)
Estado: hecho

## Objetivo

`/activities` hoy es una lista plana, sin agrupar, angosta (`max-w-2xl`) con espacio vacío a la derecha, sin forma de filtrar. El objetivo es que la vista tenga más vida: actividades agrupadas por día (Today / Yesterday / fecha), un ícono minimalista por categoría de deporte, uso real del ancho disponible, y filtros por fecha y por categoría.

Salida observable: entrar a `/activities` muestra las actividades agrupadas bajo encabezados de fecha, cada fila con su ícono de categoría, la fila usa el ancho completo del shell (nada de columna angosta con espacio muerto a la derecha), y se puede filtrar por categoría y por rango de fecha sin recargar a mano (server-rendered vía `searchParams`).

## Alcance

**Entra:**
- Agrupación por fecha con encabezados relativos (Today/Yesterday) y fecha absoluta para el resto.
- Taxonomía de categorías de deporte + un ícono SVG minimalista por categoría (no por `sportType` exacto — varios `sportType` comparten categoría).
- Rediseño de la fila para usar el ancho completo del shell (sacar el `max-w-2xl` actual, que contradice `docs/style.md` — "Layout de escritorio").
- Filtros server-side (URL `searchParams`, sin JS de cliente) por categoría y por rango de fecha.
- Nueva función de repositorio con filtros a nivel de query (`packages/db`), sin tocar `findRecentActivities` (la sigue usando el widget "Recent activity" del dashboard, caso de uso distinto: 1 sola actividad, sin filtros).

**No entra (por ahora):**
- Paginación/infinite scroll más allá del límite actual (100) — el filtro de fecha sí busca en todo el histórico a nivel de query, no solo dentro de esos 100; una vista *sin* filtro que necesite más de 100 queda para otro cambio.
- Edición/borrado de actividades, notas o tags.
- Búsqueda de texto libre por nombre de actividad.

## Diseño

### Agrupación por fecha

`activities.startTimeLocal` ya es la hora local tal como la reporta Garmin (`packages/db/src/schema/activities.ts`, sin conversión) — la fecha de cada actividad sale directo de ahí, sin tocar zona horaria. Lo que sí necesita zona horaria es saber qué fecha es "hoy" y "ayer" **ahora mismo** para el usuario: se resuelve con la infra que ya existe (`findUserTimezone` + `localDateString`, `packages/core`/`packages/db`, del fix de "hoy" de esta sesión). Un helper puro (`groupActivitiesByDate`, nuevo, sin acceso a DB) arma los buckets; el nombre del encabezado es "Today" / "Yesterday" / fecha formateada (`Aug 30` si es del año actual, `Aug 30, 2025` si no).

### Categorías + íconos

**Garmin ya tiene su propia jerarquía oficial — se investigó y se confirmó en vivo, no se inventa** (`docs/garmin-api.md`, entrada nueva): `GET /activity-service/activity/activityTypes` devuelve las 154 `sportType` posibles con su `parentTypeId`. La raíz (`typeId=17, "all"`) tiene 16 categorías hijas directas; nuestra cuenta real usa `sportType` que cuelgan de 9 de esas 16.

| Categoría (Garmin `typeKey`) | Label a mostrar | `sportType` de la cuenta que caen ahí | Ícono (idea) |
|---|---|---|---|
| `running` | Running | running, treadmill_running, trail_running | figura corriendo |
| `cycling` | Cycling | road_biking, mountain_biking, indoor_cycling, e_bike_mountain | rueda/bici |
| `hiking` | Hiking | hiking | bota/sendero |
| `swimming` | Swimming | lap_swimming, open_water_swimming | onda |
| `fitness_equipment` | Gym | strength_training, hiit, indoor_cardio | mancuerna |
| `winter_sports` | Winter sports | resort_skiing, backcountry_skiing | ski/montaña |
| `team_sports` | Team sports | basketball, soccer | pelota |
| `racket_sports` | Racket sports | tennis_v2 | raqueta |
| `other` | Other | boxing, breathwork | punto/asterisco genérico |

Las 7 categorías de Garmin que la cuenta no usa hoy (`walking`, `multi_sport`, `steps`, `diving`, `safety`, `para_sports`, `water_sports`) no tienen ícono propio en esta pasada — cualquier `sportType` que caiga en una de ellas (o en cualquiera no mapeada arriba) usa el ícono genérico de `other`. El mapeo real es `sportType → typeId → parentTypeId → categoría` (tabla completa de Garmin embebida como constante, citando el dump de `docs/garmin-api.md` — mismo criterio que `packages/core/src/workout/translate.ts` con las constantes numéricas de Garmin), nunca una lista de `sportType` a mano: así un `sportType` nuevo que la cuenta empiece a usar cae en su categoría real sin tocar código.

Cada ícono es SVG a mano (mismo criterio que `Wordmark`: geométrico, trazo fino, sin relleno, `viewBox` propio), monocromo `--graphite`, mismo comportamiento de hover que el resto de una fila. Vive en `apps/web/src/components/icons/` (nuevo).

Esto es un patrón visual nuevo que `docs/style.md` no cubre — se agrega ahí primero (sección "Iconos" bajo "Componentes"), después se implementa.

### Fila: ancho completo + más columnas

`docs/style.md` ya documenta esto y la página actual lo incumple: nada de `max-width` propio angosto (`max-w-2xl` sale), y una fila de datos relacionados debería ser grid real, no dos bloques con `justify-between` dejando hueco en el medio. Fila propuesta como grid de columnas fijas: ícono · nombre + categoría · fecha/hora · distancia · duración · pace (cuando aplica — `formatPace` ya existe en `lib/format.ts`, hoy sin usar en esta lista). Incluir pace es valor gratis: el dato y el formatter ya existen.

### Filtros

Server-rendered vía `searchParams` (`?category=running&range=this_week`), sin `"use client"` para el filtrado en sí (los controles que arman la URL sí son links/form, no fetch de cliente). Nueva función en `packages/db/src/repositories/activities.ts`:

```ts
findActivities(userId, { limit, category?: string, range?: "this_week" | "this_month" | "all" })
```

- **Filtro de categoría**: chips de texto mono (mismo lenguaje visual que un nav item / chip de estado, adaptado a superficie clara — hoy `docs/style.md` solo documenta inputs sobre `--panel` oscuro, así que este es un patrón nuevo a agregar ahí también), **selección única** (de a una categoría, no varias a la vez) — decidido.
- **Filtro de fecha**: presets (This week / This month / All time), decidido, alcanza para esta pasada — sin rango custom.
- Los dos filtros combinan (`category=cycling&range=this_week` = "cycling de esta semana") — es un único `WHERE` con ambas condiciones en `findActivities`, no dos pasadas.

### Valor adicional propuesto (no pedido explícitamente, mi sugerencia)

1. **Resumen del listado, sensible a los filtros activos** (decidido): un renglón chico con el total — "42 activities · 312 km · 38h12m" — recalculado sobre el resultado ya filtrado, así que cambia solo con la fecha (This week), solo con la categoría (Cycling), o con la combinación de ambos (This week + Cycling). Mismos formatters que ya existen, costo marginal nulo porque `findActivities` ya trae el set filtrado completo.
2. **Micro-resumen por grupo**: junto a cada encabezado de fecha, conteo — "Today · 2 activities".
3. **Estado vacío específico de filtro**: "No activities match these filters" (distinto del "No activities synced yet" global) para que filtrar a cero no parezca un error.
4. **Reusar el mismo set de íconos** en el widget "Recent activity" del dashboard — mismo sistema, un solo lugar donde vive la categoría.
5. **Fix de `.toLocaleDateString()`** (decidido, entra en este cambio): `recent-activity.tsx` y la página de detalle de actividad muestran la fecha con `activity.startTimeLocal.toLocaleDateString()` — usa el locale/zona del *proceso del servidor*, no la del usuario. Se resuelve con el mismo helper `groupActivitiesByDate`/criterio Today-Yesterday-fecha de este spec.

## Checklist de implementación

- [x] `docs/style.md`: sección "Iconos" (Componentes) — patrón SVG, trazo, tamaño, color
- [x] `docs/style.md`: patrón de chips de filtro sobre superficie clara (Componentes)
- [x] Constante de la jerarquía Garmin (`typeId`/`typeKey`/`parentTypeId`, citando `docs/garmin-api.md`) + `getActivityCategory(sportType)`
- [x] `apps/web/src/components/icons/`: set de íconos por categoría (9 con ícono propio + fallback `other`)
- [x] `packages/db`: `findActivities(userId, { limit, sportTypes?, range? })`, un solo `WHERE` combinando ambos filtros
- [x] Helper puro `groupActivitiesByDate` (Today/Yesterday/fecha)
- [x] `activities/page.tsx`: saca `max-w-2xl`, fila en grid real (ícono · nombre+categoría · fecha/hora · distancia · duración · pace), lee `searchParams` para filtros
- [x] Chips de categoría (selección única) + presets de fecha (controles que arman la URL, sin fetch de cliente)
- [x] Resumen de listado (sensible a fecha + categoría combinados) + micro-resumen por grupo
- [x] Estado vacío específico de "sin resultados para estos filtros"
- [x] Fix de `.toLocaleDateString()` en `recent-activity.tsx` y detalle de actividad, mismo criterio Today/Yesterday/fecha

## Notas de cierre

- **`ListRow` se refactorizó, no se copió**: `findActivities` necesitaba una fila de más columnas que el `flex justify-between` de 2 slots de `ListRow`. En vez de copiar su `className` de 8+ utilidades (prohibido por `apps/web/CLAUDE.md`, regla de reuso), se extrajo el "chrome" compartido (borde/hover/foco) a `ROW_CHROME` — `ListRow` le suma `flex justify-between`, la fila nueva de `/activities` (`ActivityRow`) le suma `grid` con columnas fijas vía `style` inline (mismo patrón ya usado en `dashboard-layout-editor.tsx`).
- **Gotcha de lint real, `react-hooks/static-components`**: resolver el ícono por categoría con una función (`getActivityIcon(category)`) y asignarlo a una variable capitalizada (`const Icon = ...`) usada como tag JSX dispara ese error — el linter no puede probar estáticamente que la función siempre devuelve una referencia estable, aunque en los hechos sí lo hace (viene de un `Record` fijo a nivel de módulo). Se resolvió exportando el `Record` (`ACTIVITY_ICON`) directo y haciendo el lookup por índice en el consumidor (`ACTIVITY_ICON[category]`) en vez de pasar por una función — mismo resultado, el linter sí lo reconoce como estable.
- **Verificado con datos reales, no solo la cuenta de prueba**: la cuenta de prueba usada para el screenshot visual tiene `sportType` sembrados a mano con nombres simplificados (`"climbing"`, `"tennis"`, `"skiing"`) que no coinciden con los `typeKey` reales de Garmin (`indoor_climbing`, `tennis_v2`, `resort_skiing`) — varias filas ahí caen en el ícono `other` genérico, pero es un artefacto de los datos de prueba, no un bug del mapeo. Se confirmó por separado, corriendo `getActivityCategory` contra los 21 `sportType` reales de la cuenta `f@example.com`: los 21 resuelven exactamente a la categoría esperada de la tabla del spec.
- **`findActivities` filtra por categoría vía `sportTypes IN (...)`**, no filtrando en TS después del `SELECT` — importante con el `limit` de por medio: filtrar después traería menos resultados de los que debería si la categoría tiene más actividades que el límite mezcladas con otras categorías.
