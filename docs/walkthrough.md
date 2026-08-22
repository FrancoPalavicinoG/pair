# Walkthrough — cómo funciona lo construido y por qué

Complemento de `docs/architecture.md` (estado actual, referencia rápida) y `docs/setup.md` (cómo se creó cada paquete). Acá va la explicación en profundidad: qué problema resuelve cada pieza, qué alternativas se descartaron, y qué patrón o concepto del lenguaje/framework enseña. Documento vivo: se amplía con cada fase nueva, no es una foto fija de P0-P2.

Los `CLAUDE.md` de cada paquete (`packages/db/CLAUDE.md`, `packages/core/CLAUDE.md`, `services/garmin-auth/CLAUDE.md`) son la referencia oficial y terse de reglas. Este doc desarrolla el porqué detrás de esas reglas.

---

## 1. Monorepo (`cb60581`)

pnpm workspaces, con `packages/config` como base sin dependencias del resto (tsconfig estricto, eslint, prettier compartidos — todo `tsconfig.json` del repo extiende de ahí).

**Sin Turborepo todavía**: decisión explícita, no un olvido — `docs/setup.md` dice que se suma "cuando el número de paquetes o la necesidad de cachear tareas lo justifique". Principio que se repite en varios lados del proyecto: no metas una herramienta antes de que el dolor que resuelve exista de verdad.

## 2. `packages/core` — el núcleo puro (`3d68a59`)

Regla fuerte: **dependency injection manual**. `client.ts` no importa `fetch` global ni lee `process.env`; todo entra por el objeto `GarminClientDeps` (`packages/core/src/garmin/client.ts:12`). Es lo que permite testear el cliente sin red: le pasás un `fetch` falso en el test, sin mockear ningún módulo.

Dos mecanismos para entender a fondo:

- **Retry-on-401 una sola vez** (`client.ts:44-48`): si el access token venció, refresca y reintenta *una vez*. Si vuelve a fallar, es un error real. Evita el bug clásico de refresh infinito sin necesitar lógica de conteo.
- **Rate limiter por encadenamiento de promesas** (`limiter.ts`): no hay cola ni `setInterval`. Cada llamada nueva se encadena al final de la promesa anterior (`chain = run.catch(() => undefined)`), así nunca hay dos en vuelo a la vez, y siempre queda el `sleep` mínimo entre una y la siguiente. El `.catch()` está en la cadena interna, no en el `run` que se devuelve — por eso un fallo no traba las llamadas siguientes, mientras quien pidió *esa* llamada sí ve el error. Mutex asíncrono sin ninguna librería.

## 3. `services/garmin-auth` — el sidecar Python (`362cddf`)

Mismo patrón Controller-Service-Repository que en TS, pero sin capa Repository porque no hay DB (`services/garmin-auth/CLAUDE.md`). Dos decisiones no obvias:

- **Un `Client` de `garth` nuevo por request** (`garmin_service.py:29-33`), no el singleton global de la librería — con el singleton, dos logins concurrentes de dos amigos distintos pisarían sus cookies de sesión entre sí. Bug de concurrencia evitado a propósito.
- **Estado de MFA en memoria del proceso, con TTL** (`garmin_service.py:26`, dict global `_mfa_sessions`), nunca en DB: el `Client` vivo no es serializable, y el dato es efímero por naturaleza (5 min). Coherente con la regla dura del `CLAUDE.md` raíz de nunca persistir MFA.
- **Traducción de errores** (`_translate`, `garmin_service.py:36-47`): el único dato real para distinguir "credenciales malas" de "Garmin cambió el flujo" es el status HTTP que devolvió `garth`. Por eso `SSO_CHANGED` existe como catch-all: es la señal de alarma de que hay que mirar `docs/garmin-api.md`.

## 4. `packages/db` — schema y cifrado (`e1508e0`, `e8bccf8`)

- **Aislamiento multiusuario a nivel de schema, no de disciplina**: toda tabla con dato de usuario tiene `user_id` con FK `onDelete: cascade`. Borrar un usuario borra sus filas solo, sin depender de acordarse de hacerlo en cada lugar.
- **Constraints únicos como invariantes de negocio**: `unique().on(table.userId)` en `garmin_credentials` dice "un usuario tiene como máximo una credencial Garmin" a nivel de base, no en código de aplicación que alguien podría olvidar validar.
- **Branded type para evitar escribir texto plano por accidente** (`schema/garmin-credentials.ts:5`): `EncryptedPayload` es un `string` con una marca fantasma (`__brand`) que **solo** `seal()` en `crypto.ts` puede producir. TypeScript impide pasarle un string cualquiera a esa columna — truco de tipos, nada en runtime, pero el compilador frena si intentás guardar un token sin cifrar.
- **Clave derivada por usuario, no una clave global** (`crypto.ts:28-30`): `HMAC-SHA256(masterKey, userId)` da una subclave distinta por usuario a partir de una sola master key en el entorno. Si se filtra el ciphertext de un usuario, no compromete a los demás.

## 5. `packages/sync` + `scripts/sync.ts` — CSR aplicado a un CLI (`d375f4b`, `94b3eb7`)

`scripts/sync.ts` es el Controller (parsea `--user`, hace I/O de terminal, nada de lógica); `garmin-sync-service.ts` es el Service. En `syncActivities` (`garmin-sync-service.ts:132-171`) se pagina hacia atrás en el tiempo y se para en cuanto aparece un `garminActivityId` ya conocido — eso es el sync incremental (2.9s vs 47.6s en la corrida real del roadmap). `syncDailyMetrics` tiene una regla explícita: el día de hoy se re-sincroniza siempre aunque ya tenga fila, porque sus datos (pasos, sueño) siguen cambiando hasta la noche.

## 6. `apps/web` scaffold + estilos (`0434592`, `10e97b1`)

Lo único comiteado acá es el scaffold de Next.js (App Router) + la aplicación de `docs/style.md` a `layout.tsx`/`globals.css` (fuentes, tokens de color, textura). Sin lógica de negocio todavía.

---

Cubre P0, P1 completo, y la infraestructura de P2 (schema de auth, scaffold, estilos). La aplicación de login en sí (rutas, sesión, service) queda fuera a propósito: es el primer ejercicio guiado, ver `docs/specs/app-auth.md` cuando exista.
