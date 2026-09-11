# Spec: Tools de lectura (`list_activities`, `get_activity`, `get_daily_metrics`)

Roadmap: P3 (MCP y conectores), ítem "Tools de lectura: actividades y métricas diarias..."
Estado: hecho

## Objetivo

Que Claude pueda leer actividades y métricas diarias reales del usuario a través de `apps/mcp`, en formato pensado para que un LLM razone sobre eso (texto legible, unidades explícitas, resumido), no un dump de columnas de la DB.

Salida observable: con un token que tenga `activities:read`/`metrics:read`, Claude puede listar las actividades recientes de una cuenta real, pedir el detalle de una en particular, y consultar las métricas diarias de un rango de fechas — cada una con datos reales, no inventados.

## Alcance

**Entra**: `list_activities`, `get_activity`, `get_daily_metrics` — las tres tienen datos reales ya sincronizados en `packages/db` (`activities`, `daily_metrics`).

**No entra** (diferido, no es una omisión):
- `list_workouts`: depende del DSL `PairWorkout`, que todavía no existe (ítem siguiente del roadmap). Sin DSL no hay qué listar.
- Tools de "insight" (carga, HRV, readiness traducidos a razonamiento) que el roadmap menciona para este mismo ítem: explícitamente pospuestas a pedido del usuario. Estas tres tools devuelven los datos que Garmin ya calculó (readiness score, ACWR, etc. — números que Garmin computa, no que nosotros derivamos), en lenguaje legible, pero no agregan una capa de interpretación propia todavía.
- Tools de escritura (`workout_*`): su propio ítem, con el patrón preview→confirm.
- `weight`/`bmi` de `daily_metrics`: la unidad de `weight` nunca se confirmó contra un dato real (comentario en `packages/db/src/schema/daily-metrics.ts` — la cuenta de prueba no tiene peso cargado). Regla dura del proyecto: no inventar unidades. Quedan fuera de la salida de `get_daily_metrics` hasta confirmarlas con `/garmin-endpoint`.

## Diseño

### Promover formato y categorías a `packages/core` (mismo patrón que `deriveGarminStatus`)

`formatDistance`, `formatDuration`, `formatPace`, `formatSpeed`, `formatLabel` (`apps/web/src/lib/format.ts`) y `getActivityCategory`/`getSpeedDisplay`/`ACTIVITY_CATEGORIES` (`apps/web/src/lib/activity-category.ts`) hoy viven solo en `apps/web`. Son funciones puras (número/string → string), sin `next/navigation` ni nada web-específico — `apps/mcp` los necesita para las mismas conversiones (una actividad de running se lee igual de "5.2 km, 28:30, ritmo 5:29 min/km" en la web que en una respuesta de tool). Mismo criterio que ya se aplicó con `deriveGarminStatus` (promovido a `packages/db` cuando `apps/mcp` se volvió el segundo consumidor): se mueven a `packages/core/src/format.ts` y `packages/core/src/activity-category.ts`, `apps/web` importa de ahí en vez de definirlos local. Ningún cambio de comportamiento, solo de ubicación.

### Patrón compartido: verificación de scope + errores de tool

Nuevo helper en `apps/mcp/src/tools/require-scope.ts`: dado el `ctx` de una tool y el scope requerido, devuelve `{ userId, scopes }` o un `CallToolResult` con `isError: true` y mensaje legible ("Esta acción necesita el permiso 'Ver tus actividades y su detalle', que esta conexión no tiene — reconectá desde `/connections` con ese permiso habilitado."). Nunca lanza una excepción JSON-RPC cruda para esto: regla de `apps/mcp/CLAUDE.md` ("los errores... nunca stack traces"), y un `isError` en el resultado es lo que un LLM puede leer y actuar en consecuencia, a diferencia de un error de protocolo.

Mismo criterio para errores de "no encontrado" (`get_activity` con un id que no existe o no es de ese usuario): `isError: true` con mensaje legible, no una excepción.

### `list_activities`

- Scope: `activities:read`.
- Input (Zod): `range` (`"this_week" | "this_month" | "all"`, opcional, default `"this_week"` — reusa el tipo `ActivityRange` ya definido en `packages/db/src/repositories/activities.ts`), `category` (opcional, una de `ACTIVITY_CATEGORIES`), `limit` (opcional, default 20, máximo 50 — nunca un volcado gigante).
- Llama `findActivities(userId, { limit, sportTypes: category ? getSportTypesForCategory(category) : undefined, range })` (ya existe, mismo repository que usa `/activities` en la web).
- Salida: una línea legible por actividad — fecha local, nombre o categoría, distancia (`formatDistance`), duración (`formatDuration`), pace/velocidad según categoría (`getSpeedDisplay`) — más el total de actividades devueltas. El `id` interno (uuid) no se expone; se expone el `garminActivityId` (el único identificador que `get_activity` puede usar después, y el que en algún momento el usuario podría reconocer si mira Garmin Connect directo).

### `get_activity`

- Scope: `activities:read`.
- Input: `garminActivityId` (number, requerido) — no el `id` uuid interno, nunca expuesto.
- Llama `findActivityByGarminId(userId, garminActivityId)` (ya existe). Si no existe o pertenece a otro usuario (la query ya filtra por `userId`, así que "no existe" y "no es tuya" son la misma respuesta — no hay forma de que un id ajeno filtre nada), `isError` con mensaje legible.
- Salida: todos los campos normalizados de la tabla (nombre, categoría, fecha/hora local, duración, distancia, pace/velocidad, calorías) en texto legible. **No se expone `raw`** (el JSONB crudo de Garmin) — es payload interno para debugging, no algo que un LLM necesite ni deba parsear él mismo.

### `get_daily_metrics`

- Scope: `metrics:read`.
- Input: `days` (opcional, default 7, máximo 30 — ya es una tabla ancha, sin límite superior sería un volcado gigante para varias semanas).
- Llama `findRecentDailyMetrics(userId, days)` (ya existe).
- Salida: una sección por día (fecha local, `localDateString` ya usado en el repository) con los campos que sí tienen unidad confirmada: pasos, FC en reposo, sueño (duración + score), body battery, estrés, SpO2, respiración, HRV (status + promedios), estado de entreno/carga aguda-crónica/ACWR, readiness, hill/endurance score, VO2 max, aclimatación. Un campo `null` en un día (falta ese dato puntual) se omite de esa sección, no se muestra como "N/A" — mismo criterio que ya sigue el widget de dashboard (`daily-metrics.tsx`: `if (value == null) return null`).

### Convención de nombres de campo hacia el LLM

Las labels ya están decididas y vetadas en `apps/web/src/app/(app)/dashboard/_components/widgets/daily-metrics.tsx` (`METRICS` record: "Resting HR", "Body battery", "SpO2", etc., con sus unidades). Las tools reusan las mismas labels — no se inventan nuevas en este cambio.

## Checklist de implementación

- [x] Promover `format.ts`/`activity-category.ts` a `packages/core`, actualizar los imports en `apps/web` (sin cambio de comportamiento)
- [x] `apps/mcp/src/tools/require-scope.ts`: helper de verificación de scope + `CallToolResult` de error
- [x] `apps/mcp/src/tools/list-activities.ts`
- [x] `apps/mcp/src/tools/get-activity.ts`
- [x] `apps/mcp/src/tools/get-daily-metrics.ts`
- [x] Registrar las 3 en `apps/mcp/src/mcp-session.ts` (junto a `get_started`)
- [x] Actualizar la tabla de tools de `apps/mcp/CLAUDE.md`
- [x] Probado a mano de punta a punta contra la cuenta real (curl + JSON-RPC real, mismo mecanismo de los ítems anteriores): `list_activities` (con y sin filtros), `get_activity` (encontrada y no encontrada), `get_daily_metrics`, y el rechazo por scope faltante — todos con datos reales, ninguno inventado
- [x] Probado con Claude Desktop real: listó actividades, detalle de una puntual y métricas diarias correctamente. Feedback del usuario: la lectura de datos anda bien; falta que Claude sepa *interpretar* esas métricas (carga, tendencias) — eso es a propósito de este spec, es el trabajo de las tools de "insight" pospuestas.

## Actualización (2026-09-09): Zod v4 solo para `inputSchema` de tools

Al implementar, `registerTool` (con `inputSchema`) no compiló contra Zod v3.25 (el que usa el resto del proyecto): la interfaz que exige (`StandardSchemaWithJSON`, confirmada contra el `.d.ts` del paquete instalado) requiere `~standard.jsonSchema`, que solo Zod v4 implementa. `get_started` (spec anterior) no lo notó porque no tiene `inputSchema`.

Decisión, con el usuario: alias `"zod4": "npm:zod@^4.5.4"` en `apps/mcp/package.json`, usado solo en los 3 archivos de tools nuevos. Las rutas OAuth (`src/oauth/routes.ts`), ya probadas end-to-end, siguen en Zod v3 sin tocarse ni re-testearse — alternativa descartada fue migrar todo `apps/mcp` a v4, que hubiera exigido re-verificar ese código ya probado sin necesidad real. Detalle en `apps/mcp/CLAUDE.md`.

## Preguntas abiertas

Ninguna — la redacción de las `description` quedó resuelta al implementar.
