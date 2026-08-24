# Spec: Estado de sincronización visible y reconexión

Roadmap: P2 (Web app), cuarto ítem ("Estado de sincronización visible y reconexión cuando las credenciales expiran")
Estado: hecho

## Objetivo

Que un amigo vea en `/dashboard` si su Garmin está sincronizando, cuándo fue la última vez, y que si sus credenciales dejaron de funcionar se le pida reconectar en vez de fallar en silencio. Cierra lo que `app-auth` y `app-garmin-connect` dejaron diferido a propósito.

Salida observable: al conectar Garmin (o apretar "Sync now"), el dashboard muestra "Syncing…" y se refresca solo hasta mostrar "Last synced: [fecha]"; un guard evita que dos sincronizaciones corran a la vez; si el refresh de credenciales falla, el dashboard muestra "Garmin disconnected" con link a `/settings/garmin`.

## Alcance

**Entra**: dos columnas nuevas en `garmin_credentials` (`lastSyncedAt`, `syncInProgress`), una función de sync orquestada en `packages/sync`, disparo automático al conectar + botón manual, estado visible en el dashboard.

**No entra** (diferido, no es una omisión):
- Historial de sincronizaciones (tabla `sync_jobs`): no hay necesidad real de ver corridas pasadas todavía, se agrega si aparece.
- Reintentos automáticos o backoff si el sync falla: se muestra el error, el usuario reintenta a mano con "Sync now".
- Cualquier tipo de notificación (email, push) de reconexión: fuera de alcance del proyecto.
- Historial de qué causó cada reconexión: solo se sabe "algo de Garmin falló", no el detalle.

## Diseño

- **Estado de sync vive en `garmin_credentials`, no en una tabla nueva**: `lastSyncedAt` (timestamp, nullable) y `syncInProgress` (boolean, default false). Ya existe `status`/`lastRefreshedAt` ahí; agregar dos columnas es menos trabajo que una tabla nueva para un caso que hoy no necesita historial, y sigue el mismo principio de `packages/db/CLAUDE.md`: no crear tablas antes de que la fase las pida.
- **Sync disparado con `after()` de `next/server`** (no bloqueante, corre después de mandar la respuesta), en dos puntos: automático al final de `connectGarminAction` (éxito de conexión), y manual desde un botón "Sync now" en el dashboard (nuevo Server Action). Sin BullMQ, sin cola — mismo principio de P1 ("no antes de que el volumen lo pida").
- **Con polling liviano, revisado tras probar en vivo.** La decisión original era "sin polling, el usuario recarga" — probándolo con clicks reales de "Sync now" (que además expusieron el problema de clicks concurrentes de abajo), sin ningún feedback la espera se siente rota, no "todavía sincronizando". Se agrega un Client Component chico (primera vez que este proyecto usa `useEffect`) que, mientras `syncInProgress` es `true`, llama a `router.refresh()` cada pocos segundos; en cuanto el servidor devuelve `syncInProgress: false`, el propio cambio de prop corta el polling (no hace falta desmontar nada a mano).
- **Guard contra sincronizaciones simultáneas**: "Sync now" ahora chequea el `syncInProgress` actual antes de programar un sync nuevo. Si ya hay uno corriendo, no hace nada — evita el problema real que apareció al probar (varios clicks seguidos disparaban varios `runFullSync` en paralelo, cada uno con su propio rate limiter pegándole a Garmin al mismo tiempo, alargando la espera sin ningún beneficio).
- **Nueva función orquestadora en `packages/sync`** (junto a `syncActivities`/`syncDailyMetrics`, que reusa tal cual): carga credenciales, arma el cliente, corre ambos syncs, y actualiza `lastSyncedAt`/`syncInProgress` antes y después. Vive en `packages/sync` (capa de Service), no en `apps/web`, porque es lógica de sync reutilizable, no de UI.
- **Reconexión**: si el sync falla al intentar refrescar el token (la llamada a `/refresh` del sidecar falla con cualquier error de Garmin), se marca `status: "expired"` en `garmin_credentials`. Riesgo aceptado, a propósito: no se distingue entre "credenciales realmente inválidas" y otras causas (ej. `RATE_LIMITED`) porque `GarminApiError` no expone el código de Garmin como campo estructurado, solo como parte del mensaje — separarlos hoy es más trabajo del que el caso justifica. Si en la práctica genera falsos positivos de "reconectar", se ajusta entonces.
- **Dashboard**: si `status !== "active"`, banner de reconexión con link a `/settings/garmin` (ruta que ya existe) en vez del estado normal de sync.

## Checklist de implementación

- [x] Columnas `lastSyncedAt`/`syncInProgress` en `packages/db/src/schema/garmin-credentials.ts` + migración (`pnpm db:generate` + `pnpm db:migrate`)
- [x] Función de update de esas columnas en `packages/db/src/repositories/garmin-credentials.ts`
- [x] Función orquestadora de sync en `packages/sync` (reusa `syncActivities`/`syncDailyMetrics`/`createSyncClient`/`loadCredentials` tal cual)
- [x] `connectGarminAction` dispara el sync automático con `after()` al conectar con éxito (implementado y revisado; el disparo automático en sí no se re-probó en vivo en esta sesión, solo el botón manual — mismo código)
- [x] Server Action nueva para "Sync now", con guard contra sincronizaciones simultáneas
- [x] `SyncStatusPoller`: Client Component que refresca la página sola mientras `syncInProgress` es `true`
- [x] Dashboard muestra los cuatro estados (no conectado / sincronizando / última vez hace X / reconectar) + botón "Sync now"
- [x] Probado end-to-end contra una cuenta real (2026-08-24): "Sync now" dispara el sync, la página se refresca sola hasta mostrar "Last synced", y clickear dos veces seguidas ya no dispara sincronizaciones duplicadas. El estado de reconectar no se probó en vivo (difícil de provocar sin invalidar credenciales reales, mismo criterio que el camino de MFA del spec anterior).

## Bug encontrado y corregido durante la implementación

Los primeros tests mostraron el dashboard "pegado" en sincronizando. Causa real: `syncNowAction` no le avisaba a Next.js que había que re-renderizar la página después de escribir en la DB (a diferencia de `connectGarminAction`, que sí lo hace porque termina en `redirect`) — Server Actions solo revalidan solas si mutan cookies, llaman `redirect`, o llaman `revalidatePath`/`revalidateTag`/`refresh()` explícitamente. Esto no estaba en el plan original. Además, clicks repetidos disparaban varios `runFullSync` en paralelo (cada uno con su propio rate limiter), alargando la espera sin beneficio — de ahí salió el guard. Los dos hallazgos llevaron también a agregar el polling que originalmente se había descartado (ver Diseño).
