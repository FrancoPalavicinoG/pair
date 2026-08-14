# Arquitectura

## Vista general

```
   Claude Desktop / Claude Code
            │  MCP over Streamable HTTP + OAuth 2.1
            ▼
   ┌──────────────────────┐        ┌─────────────────────┐
   │   apps/mcp           │───────▶│  services/          │
   │   MCP server         │        │  garmin-auth        │
   │   + OAuth AS/RS      │        │  FastAPI + garth    │
   └────────┬─────────────┘        │  login/mfa/refresh  │
            │                      └──────────┬──────────┘
            │ packages/core                   │ SSO + OAuth1→OAuth2
            │ (cliente REST TS, DSL,          ▼
            │  traductor, limiter)      sso.garmin.com
            │        │
            │        └──────────────▶ connectapi.garmin.com  (Bearer)
            ▼
   ┌──────────────────────┐
   │  Postgres (Drizzle)  │◀──── apps/web (Next.js)
   │  + Redis (BullMQ)    │      dashboard, onboarding,
   └──────────────────────┘      consentimiento OAuth, conectores
```

## Responsabilidades

| Paquete | Responsable de | Nunca hace |
|---|---|---|
| `services/garmin-auth` | Login SSO, MFA, intercambio OAuth1→OAuth2, refresh | Llamadas de datos, lógica de negocio, acceso a la DB |
| `packages/core` | Cliente REST de Garmin, DSL de workouts, traductor, rate limiter, tipos de dominio | Depender de Next.js o del SDK de MCP |
| `packages/db` | Schema, migraciones, queries | Lógica de negocio |
| `apps/mcp` | Tools MCP, OAuth AS/RS, sesión → usuario, preview tokens | Hablar con Garmin directamente (usa `core`) |
| `apps/web` | UI, onboarding, conexión Garmin, pantalla de consentimiento, dashboard | Hablar con Garmin directamente (usa `core`) |

`packages/core` es el único que conoce Garmin. `apps/mcp` y `apps/web` son dos frontales sobre el mismo núcleo. Si una funcionalidad existe en el MCP pero no en la web, es porque no se ha expuesto, no porque esté implementada dos veces.

## Flujo: conectar Garmin

1. Usuario entra a `/settings/garmin` en la web.
2. Introduce email + contraseña de Garmin. **No se persisten.**
3. `apps/web` → `services/garmin-auth POST /login`.
4. Si Garmin pide MFA, el sidecar devuelve `mfa_required` + un `session_id` efímero (in-memory, TTL corto). La web pide el código y llama a `POST /mfa`.
5. El sidecar devuelve tokens OAuth1 (larga vida) y OAuth2 (corta vida).
6. `apps/web` cifra los tokens y los guarda en `garmin_credentials` por usuario. Cifrado sobre (libsodium secretbox con clave por usuario, clave maestra fuera de la DB); la columna nunca guarda el valor en claro.
7. Sync inicial encolado en BullMQ.

## Flujo: conectar Claude (MCP)

1. Usuario copia la URL desde `/settings/connectors` (`https://mcp.pair.app`).
2. La pega en Claude Desktop → Añadir conector personalizado.
3. Claude descubre los metadatos OAuth, se registra dinámicamente (DCR) y abre el navegador.
4. El usuario ve la pantalla de consentimiento de PAIR (ya logueado en la web) y aprueba los scopes.
5. Claude recibe el access token. Cada tool call resuelve `token → user_id → credenciales Garmin`.

Detalle en `apps/mcp/CLAUDE.md`.

## Flujo: foto → entrenamiento en el reloj

1. El usuario pega la foto en Claude. **La visión la hace Claude, no nuestro servidor.**
2. Claude produce un `PairWorkout` (DSL) y llama a `workout_preview`.
3. El servidor valida con Zod, traduce a JSON de Garmin, y devuelve un resumen legible + `preview_token`. No escribe nada.
4. El usuario confirma en el chat. Claude llama a `workout_create(preview_token)`.
5. El servidor crea el workout en Garmin y opcionalmente lo agenda (`workout_schedule`).
6. El reloj lo recibe en el siguiente sync con Garmin Connect.

## Datos

Postgres. Tablas principales:

- `users`, `sessions` — auth propia de PAIR.
- `garmin_credentials` — tokens cifrados, `user_id`, estado, `last_refreshed_at`.
- `activities` — normalizadas + `raw jsonb` con la respuesta original de Garmin.
- `daily_metrics` — resumen diario (pasos, sueño, HRV, body battery…), una fila por usuario y día.
- `workouts` — workouts creados desde PAIR, con el DSL original y el `garmin_workout_id`.
- `oauth_clients`, `oauth_grants`, `oauth_tokens` — Authorization Server del MCP.
- `sync_jobs` — trazabilidad de sincronizaciones.
- `audit_log` — toda escritura hacia Garmin: quién, qué, desde qué cliente MCP, cuándo.

Guardar siempre el `raw jsonb`: la API no es oficial, y cuando algo se rompa el payload original es la única forma de entender qué cambió.

## Despliegue

| Componente | Destino |
|---|---|
| `apps/web` | Vercel |
| `apps/mcp` | Fly.io o Railway (necesita conexiones largas) |
| `services/garmin-auth` | Fly.io, contenedor mínimo, sin exposición pública (red interna) |
| Postgres | Neon |
| Redis | Upstash |

`services/garmin-auth` **no** debe ser accesible desde internet. Solo `apps/web` y `apps/mcp` hablan con él.
