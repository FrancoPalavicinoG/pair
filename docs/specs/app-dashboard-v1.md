# Spec: Dashboard v1 — actividades, detalle, métricas diarias

Roadmap: P2 (Web app), tercer ítem ("Dashboard v1: lista de actividades, detalle, métricas diarias")
Estado: hecho

## Objetivo

Que un amigo vea en `/dashboard` sus actividades recientes y un resumen de hoy, y pueda entrar al detalle de una actividad puntual para ver más. Último ítem de P2 — con esto se cumple la salida de la fase ("un amigo se registra solo, conecta su Garmin y ve sus datos sin ayuda").

Salida observable: `/dashboard` muestra hasta 20 actividades recientes (nombre, deporte, fecha, distancia, duración) y un resumen de hoy (pasos, HR en reposo, sueño, body battery); tocar una actividad lleva a `/activities/[id]` con más detalle (HR promedio/máxima, ritmo, training effect).

## Alcance

**Entra**: lista de actividades (20 más recientes, sin paginar), resumen de métricas de hoy, página de detalle por actividad (llamando en vivo al endpoint ya confirmado), formato de unidades según `apps/web/CLAUDE.md`.

**No entra** (diferido, no es una omisión):
- Splits/laps detallados: `splitSummaries` está confirmado en la respuesta, pero renderizarlo bien varía mucho según el tipo de actividad (running vs HIIT vs ciclismo). Se muestra el resumen (`summaryDTO`) nomás; splits queda para cuando haya una razón concreta.
- Mapa de ruta / polyline: no confirmado, fuera de alcance.
- Historial de métricas diarias (gráfico, más de un día): es P4 (dashboard personalizable), ese ítem es exactamente ese problema.
- Paginación real de actividades: 20 más recientes alcanza para el volumen real del proyecto.

## Diseño

- **`fetchActivityDetail(userId, garminActivityId)` nueva en `packages/sync`**, junto a `getDisplayName` (mismo patrón: carga credenciales, arma cliente, llama a Garmin). Se llama **en vivo**, no se pre-sincroniza ni se guarda en DB — el payload es grande y solo hace falta cuando alguien mira esa actividad puntual.
- **Antes de llamar a Garmin, la Server Action de detalle verifica que la actividad sea del usuario logueado** (`findActivityByGarminId(userId, garminActivityId)` contra nuestra tabla `activities`, que ya tiene `userId` en su unique constraint) — si no aparece ahí, ni se llama a Garmin. Aislamiento multiusuario: nunca se acepta un id de actividad ajeno.
- **Validación con Zod**, siguiendo la convención ya documentada en `packages/core/CLAUDE.md` (nunca usada todavía): `packages/core/src/garmin/schemas.ts`, un schema tolerante (`.passthrough()`, campos opcionales) para la forma de `summaryDTO` que ya confirmamos (`docs/fixtures/activity-detail.anon.json`). No se valida el objeto completo campo por campo — como el resto del proyecto, solo lo que realmente se usa para mostrar algo.
- **Los campos de Garmin en el detalle vienen con sufijo `DTO`** (`summaryDTO`, `activityTypeDTO`), distinto del endpoint de lista que ya usábamos — confirmado en `docs/garmin-api.md`. El schema Zod y el código que lo consume tienen que usar esos nombres exactos, no los que garth usa internamente (que son post-procesados).
- **Formato de unidades en `apps/web/src/lib/format.ts`** (nuevo): metros → km, m/s → min/km (ritmo, no velocidad), segundos → duración legible. Regla dura de `apps/web/CLAUDE.md` ("Ritmo en min/km, no en m/s"), no una preferencia.
- **Repositorios de lectura nuevos** (no existían, solo había funciones de escritura para el sync): `findRecentActivities(userId, limit)` en `activities.ts`, `findActivityByGarminId(userId, garminActivityId)` en el mismo archivo, `findTodayMetrics(userId)` en `daily-metrics.ts`.
- **Ruta de detalle: `(app)/activities/[garminActivityId]/page.tsx`**. Se usa el id de Garmin (bigint), no un uuid interno — ya es el identificador natural en toda la lógica de sync, y no es un dato sensible que haga falta esconder.

## Checklist de implementación

- [x] `findRecentActivities`, `findActivityByGarminId` en `packages/db/src/repositories/activities.ts`
- [x] `findTodayMetrics` en `packages/db/src/repositories/daily-metrics.ts`
- [x] `packages/core/src/garmin/schemas.ts`: schema Zod tolerante para `summaryDTO`
- [x] `fetchActivityDetail` en `packages/sync`, valida con ese schema antes de devolver
- [x] `apps/web/src/lib/format.ts`: helpers de unidades (km, min/km, duración) — encontramos y corregimos un bug real de redondeo (ver abajo)
- [x] `/dashboard` muestra lista de actividades + resumen de hoy, confirmado en vivo (2026-08-24)
- [x] `(app)/activities/[garminActivityId]/page.tsx`: detalle, confirmado con la actividad `hiit` de distancia 0 (el caso que rompía `formatPace` antes del fix)
- [x] Probado contra datos reales: dashboard y detalle andan. **No probado todavía**: detalle de una actividad `running` (con distancia real, no 0) y el 404 de una actividad ajena/id inventado — quedan pendientes de una pasada rápida, no bloqueantes.
- [ ] Estética del detalle y la lista: el usuario ya marcó que falta ajustar, a propósito diferido para otra sesión.

## Bug encontrado y corregido durante la implementación

`formatPace`/`formatDuration` redondeaban minutos y segundos por separado a partir de valores distintos (uno sin redondear, otro redondeado) — con segundos fraccionarios (que Garmin manda de verdad, ej. `duration: 3784.958` en el fixture), esto producía resultados como `"2:60"` (un minuto inválido) o, en el segundo intento de arreglo, un valor silenciosamente equivocado por un minuto entero. El fix: redondear el total una sola vez, y derivar minutos y segundos de esa misma variable ya redondeada.

## Preguntas abiertas

Ninguna.
