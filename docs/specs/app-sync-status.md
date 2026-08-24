# Spec: Estado de sincronización visible y reconexión

Roadmap: P2 (Web app), cuarto ítem ("Estado de sincronización visible y reconexión cuando las credenciales expiran")
Estado: draft

## Objetivo

Que un amigo vea en `/dashboard` si su Garmin está sincronizando, cuándo fue la última vez, y que si sus credenciales dejaron de funcionar se le pida reconectar en vez de fallar en silencio. Cierra lo que `app-auth` y `app-garmin-connect` dejaron diferido a propósito.

Salida observable: al conectar Garmin, el dashboard muestra "sincronizando por primera vez" y después "última sincronización: hace X"; un botón "Sync now" repite el sync cuando se quiera; si el refresh de credenciales falla, el dashboard muestra "Garmin desconectado, reconectar" con link a `/settings/garmin`.

## Alcance

**Entra**: dos columnas nuevas en `garmin_credentials` (`lastSyncedAt`, `syncInProgress`), una función de sync orquestada en `packages/sync`, disparo automático al conectar + botón manual, estado visible en el dashboard.

**No entra** (diferido, no es una omisión):
- Historial de sincronizaciones (tabla `sync_jobs`): no hay necesidad real de ver corridas pasadas todavía, se agrega si aparece.
- Reintentos automáticos o backoff si el sync falla: se muestra el error, el usuario reintenta a mano con "Sync now".
- Cualquier tipo de notificación (email, push) de reconexión: fuera de alcance del proyecto.
- Refrescar la UI sola mientras el sync corre en background: el usuario recarga la página (ver Diseño).

## Diseño

- **Estado de sync vive en `garmin_credentials`, no en una tabla nueva**: `lastSyncedAt` (timestamp, nullable) y `syncInProgress` (boolean, default false). Ya existe `status`/`lastRefreshedAt` ahí; agregar dos columnas es menos trabajo que una tabla nueva para un caso que hoy no necesita historial, y sigue el mismo principio de `packages/db/CLAUDE.md`: no crear tablas antes de que la fase las pida.
- **Sync disparado con `after()` de `next/server`** (no bloqueante, corre después de mandar la respuesta), en dos puntos: automático al final de `connectGarminAction` (éxito de conexión), y manual desde un botón "Sync now" en el dashboard (nuevo Server Action). Sin BullMQ, sin cola — mismo principio de P1 ("no antes de que el volumen lo pida").
- **Sin polling**: mientras `syncInProgress` es `true`, el dashboard lo muestra así; el usuario recarga la página para ver si terminó. Cero infraestructura de cliente nueva.
- **Nueva función orquestadora en `packages/sync`** (junto a `syncActivities`/`syncDailyMetrics`, que reusa tal cual): carga credenciales, arma el cliente, corre ambos syncs, y actualiza `lastSyncedAt`/`syncInProgress` antes y después. Vive en `packages/sync` (capa de Service), no en `apps/web`, porque es lógica de sync reutilizable, no de UI.
- **Reconexión**: si el sync falla al intentar refrescar el token (la llamada a `/refresh` del sidecar falla con cualquier error de Garmin), se marca `status: "expired"` en `garmin_credentials`. Riesgo aceptado, a propósito: no se distingue entre "credenciales realmente inválidas" y otras causas (ej. `RATE_LIMITED`) porque `GarminApiError` no expone el código de Garmin como campo estructurado, solo como parte del mensaje — separarlos hoy es más trabajo del que el caso justifica. Si en la práctica genera falsos positivos de "reconectar", se ajusta entonces.
- **Dashboard**: si `status !== "active"`, banner de reconexión con link a `/settings/garmin` (ruta que ya existe) en vez del estado normal de sync.

## Checklist de implementación

- [ ] Columnas `lastSyncedAt`/`syncInProgress` en `packages/db/src/schema/garmin-credentials.ts` + migración (`pnpm db:generate` + `pnpm db:migrate`)
- [ ] Función de update de esas columnas en `packages/db/src/repositories/garmin-credentials.ts`
- [ ] Función orquestadora de sync en `packages/sync` (reusa `syncActivities`/`syncDailyMetrics`/`createSyncClient`/`loadCredentials` tal cual)
- [ ] `connectGarminAction` dispara el sync automático con `after()` al conectar con éxito
- [ ] Server Action nueva para "Sync now" en el dashboard
- [ ] Dashboard muestra los tres estados (sincronizando / última vez hace X / reconectar) + botón "Sync now"
- [ ] Probado end-to-end contra una cuenta real: conectar dispara el sync solo, "Sync now" repite el incremental, y el estado se ve reflejado después de recargar

## Preguntas abiertas

Ninguna.
