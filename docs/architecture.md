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

## Controller-Service-Repository

Todo punto de entrada del proyecto (script de CLI, tool de MCP, ruta de la web) sigue este patrón, sin importar si corre como servicio HTTP o como script. Misma convención de carpetas en TypeScript y en Python, para reconocer la capa con solo mirar dónde vive el archivo:

- **`controllers/`**: la parte fina de entrada. Parsea el input (flags de CLI, body de un request, argumentos de una tool MCP) y llama al Service. Nunca contiene lógica de negocio.
  - `scripts/sync.ts` (CLI, todavía sin carpeta propia por ser un solo archivo)
  - `services/garmin-auth/app/controllers/auth_controller.py` (rutas `/login`, `/mfa`, `/refresh`)
- **`services/`**: la lógica real (qué está desactualizado, cuándo refrescar, cómo armar el cliente de Garmin, la máquina de estados de MFA). No sabe de CLI, HTTP ni MCP. Llama al Repository y a `packages/core`.
  - `packages/sync` — promovido en P2 cuando `apps/web` se volvió el segundo controller que lo necesita (además de `scripts/sync.ts`). Antes de eso vivía junto al único controller que lo usaba.
  - `services/garmin-auth/app/services/garmin_service.py`
- **`repositories/`**: único lugar que escribe queries de Drizzle. Todo lo demás llama funciones con nombre (`findUserByEmail`, `insertActivity`), nunca importa el cliente `db` ni las tablas.
  - `packages/db/src/repositories/`
  - `services/garmin-auth` no tiene esta capa: no tiene DB, solo el estado efímero de MFA en memoria (dentro de su `services/garmin_service.py`, no en una carpeta `repositories/` porque no persiste nada).

## Flujo: conectar Garmin

1. Usuario entra a `/settings/garmin` en la web.
2. Introduce email + contraseña de Garmin. **No se persisten.**
3. `apps/web` → `services/garmin-auth POST /login`.
4. Si Garmin pide MFA, el sidecar devuelve `mfa_required` + un `session_id` efímero (in-memory, TTL corto). La web pide el código y llama a `POST /mfa`.
5. El sidecar devuelve tokens OAuth1 (larga vida) y OAuth2 (corta vida).
6. `apps/web` cifra los tokens y los guarda en `garmin_credentials` por usuario. Cifrado sobre (AES-256-GCM con clave por usuario derivada de una master key, master key fuera de la DB); la columna nunca guarda el valor en claro. Elegido en vez de `libsodium-wrappers` por un bug de empaquetado de esa librería con ESM nativo de Node (confirmado en P1); `node:crypto` da la misma garantía (cifrado autenticado) sin dependencias externas.
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

- `users`, `sessions` — auth propia de PAIR. `users.timezone` (IANA, ej. `America/Santiago`) se captura del browser en cada login/signup y es la zona que usa todo cálculo de "hoy" (sync diario, widgets, límites de semana) — Garmin reporta por día-calendario-local, no UTC (`docs/garmin-api.md`).
- `garmin_credentials` — tokens cifrados, `user_id`, estado, `last_refreshed_at`.
- `activities` — normalizadas + `raw jsonb` con la respuesta original de Garmin.
- `daily_metrics` — resumen diario (pasos, sueño, HRV, body battery…), una fila por usuario y día.
- `workouts` — workouts creados desde PAIR, con el DSL original y el `garmin_workout_id`.
- `oauth_clients`, `oauth_grants`, `oauth_tokens` — Authorization Server del MCP.
- `sync_jobs` — trazabilidad de sincronizaciones.
- `audit_log` — toda escritura hacia Garmin: quién, qué, desde qué cliente MCP, cuándo.
- `user_profile`, `sport_zones` (P5, prefiguradas 2026-09-10, no creadas todavía) — perfil físico y zonas de esfuerzo por deporte. Ver "Flujo: plan de entrenamiento conversacional" más abajo.
- `training_plans`, `planned_sessions` (P6, prefiguradas 2026-09-10, no creadas todavía) — el plan como objeto persistente, no solo el workout suelto que P3 agenda en Garmin. Mismo criterio de `packages/db/CLAUDE.md`: no se crean de antemano, se crean cuando el ítem del roadmap las necesita.

Guardar siempre el `raw jsonb`: la API no es oficial, y cuando algo se rompa el payload original es la única forma de entender qué cambió.

## Flujo: plan de entrenamiento conversacional (P5+P6, diseñado 2026-09-10, sin implementar)

Diseño acordado con el usuario para el caso de uso "armame un plan de running para tal carrera siguiendo el método noruego, ajustalo según mi carga real, dejame darte feedback e iterar" — más grande que el caso guía original (una foto → un workout). Tres capas, cada una en la fase del roadmap que le corresponde:

```
TrainingPlan (P6)      — objetivo (fecha de carrera, metodología en texto libre),
     │                    muchas sesiones planeadas, persistente entre conversaciones
     │  contiene muchos...
PairWorkout (P3)       — un entrenamiento puntual, targets absolutos o por zona
     │  sus targets por zona se resuelven contra...
sport_zones (P5)       — zonas de FC/potencia/ritmo por deporte, sync desde Garmin
```

**Zonas de esfuerzo, confirmado contra Garmin real (2026-09-10, ver `docs/garmin-api.md`)**: Garmin ya calcula y guarda zonas de FC por deporte (`GET /biometric-service/heartRateZones`, un array con una entrada por deporte configurado — running/general y ciclismo vistos en la cuenta de prueba, cada una con el piso de sus 5 zonas en bpm absolutos) y FTP de ciclismo con historial (`GET /biometric-service/stats/functionalThresholdPower/range/...`). **Se sincronizan desde Garmin, no se calculan con una fórmula propia** (ej. Karvonen) — Garmin ya lo resuelve mejor, a partir del umbral de lactato real del usuario. La velocidad de umbral de running también existe en la API pero su unidad no está confirmada (da un ritmo imposible si se asume m/s literal) — no se usa hasta confirmarla contra lo que la app de Garmin le muestra al usuario.

**Dónde resuelve la tool los targets por zona, no el traductor**: `packages/core` es puro (`packages/core/CLAUDE.md`: "sin acceso a DB, sin `process.env`"), así que el traductor de `workout-dsl.md` nunca consulta `sport_zones` él mismo. La resolución ("zona 3 de FC" → "150-159 bpm") la hace la tool de MCP (`workout_preview`/`workout_create`, capa de servicio) antes de llamar al traductor: lee `sport_zones` vía `packages/db`, arma un `PairWorkout` con targets ya absolutos, y ese es el que entra al traductor puro. Un `PairWorkout` guardado dentro de un plan (`planned_sessions`, ver abajo) sí puede quedar con targets por zona sin resolver — recién se resuelven a números concretos en el momento de agendarlo de verdad en Garmin (preview→confirm), nunca antes: las zonas cambian con el tiempo (un FTP nuevo), y resolver en el momento del draft dejaría el plan con números viejos.

**El plan como objeto persistente (P6)**: confirmado con el usuario que necesita sobrevivir entre conversaciones distintas (no alcanza con la memoria del chat). `training_plans` (objetivo, fecha target, metodología en texto libre — no es una constante nuestra, es contexto para que Claude razone) + `planned_sessions` (un `PairWorkout` en estado `draft` hasta que se aprueba, `approved` una vez creado en Garmin con su `garmin_workout_id`, `completed` una vez que la sesión real ya pasó y se puede linkear a la `activity` correspondiente — ese link es lo que P7 va a necesitar para comparar planeado vs. ejecutado). Editar un `draft` (Claude propone, el usuario da feedback, Claude ajusta) es una escritura normal a la DB de PAIR, sin el gate de preview→confirm — ese gate es específicamente para escrituras a Garmin (`CLAUDE.md` raíz, regla 4), y un draft todavía no tocó Garmin.

No cambia nada de lo ya implementado en P3 (transport, tools, AS). Es diseño para cuando toque especificar P5 y P6 en serio — spec propio de cada uno, plan mode recién ahí.

## Despliegue

| Componente | Destino |
|---|---|
| `apps/web` | Vercel |
| `apps/mcp` | Fly.io o Railway (necesita conexiones largas) |
| `services/garmin-auth` | Fly.io, contenedor mínimo, sin exposición pública (red interna) |
| Postgres | Neon |
| Redis | Upstash |

`services/garmin-auth` **no** debe ser accesible desde internet. Solo `apps/web` y `apps/mcp` hablan con él.
