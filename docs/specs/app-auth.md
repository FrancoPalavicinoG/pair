# Spec: Auth propia de PAIR (email + password)

Roadmap: P2 (Web app), primer ítem ("Auth propia de PAIR: email + password")
Estado: hecho

## Objetivo

Que un amigo pueda crear su cuenta propia de PAIR (distinta de su cuenta de Garmin), iniciar sesión y salir, y que cualquier página futura del dashboard quede protegida detrás de esa sesión. Es la base sobre la que se construye el resto de `apps/web`.

Salida observable: `/` sin sesión redirige a `/login`; crear cuenta o loguear deja una cookie de sesión y lleva a `/dashboard`; `/dashboard` sin sesión válida redirige a `/login`; `/login`/`/signup` con sesión activa redirigen a `/dashboard`.

## Alcance

**Entra**: signup, login, logout, sesión vía cookie httpOnly, gate de rutas protegidas.

**No entra** (diferido, no es una omisión):
- Conectar Garmin: siguiente ítem del roadmap.
- Recuperación de contraseña, magic link, passkeys: ya diferidos en `docs/roadmap.md`.
- Verificación de email: no hace falta para un círculo cerrado de amigos con invitación directa.
- Rate limiting de intentos de login: mismo motivo, "no optimices para escala que no existe" (`CLAUDE.md` raíz).
- Base visual de `apps/web` (fuentes, tokens, textura): ya aplicada por separado (`92e8518`).

## Diseño

Decisiones discutidas y elegidas juntos, con la alternativa descartada:

- **Sesión = fila en `sessions`, el uuid de la fila es directamente el valor de la cookie** (no JWT). Revocar una sesión es un `DELETE`. Descartado JWT firmado: sin pegarle a la DB en cada request, pero revocar antes de la expiración exige una blocklist, que vuelve a necesitar estado y pierde la ventaja.
- **Password propia de PAIR ≠ password de Garmin.** La de PAIR se hashea con **bcrypt** (12 rounds, `packages/db/src/auth.ts`, ya existe de P2 #16). Descartado argon2id: más resistente a GPU/ASIC, pero el paquete de Node típicamente requiere un binario nativo, fricción de build sin motivo concreto para un círculo cerrado de amigos. La de Garmin nunca se persiste (regla dura de `CLAUDE.md` raíz, no cambia acá).
- **Una sola clase de error, `AuthError`** (`packages/core/src/errors.ts`), para credenciales inválidas, email repetido y validación fallida. Mensaje distinto, misma clase: tres clases separadas es sobre-ingeniería para un MVP con estos tres casos. Si en el futuro la UI necesita reaccionar distinto a cada caso, se separan entonces.
- **Submit de login/signup vía Server Actions** (`"use server"`), no API Routes. El `<form>` llama la función server-side directo, sin serializar/deserializar JSON a mano; es el patrón que Next.js App Router espera para mutaciones desde formularios, y no hay otro cliente que necesite pegarle a un endpoint REST acá.
- **Rutas protegidas vía chequeo en el layout**, no middleware. El layout de `(app)` llama a `requireSession()` y redirige si no hay sesión. Descartado middleware centralizado: corre en Edge runtime con APIs de Node limitadas (complica el acceso directo a Postgres), y es más "invisible" para leer el flujo completo mientras se aprende el patrón. Puede sumarse después si hace falta centralizar.
- **Controller-Service-Repository**: los Server Actions de cada ruta (`(auth)/login/actions.ts`, `(auth)/signup/actions.ts`) son el controller, llaman a `apps/web/src/services/auth-service.ts` (service: valida con zod, hashea/verifica, llama a los repos de `@pair/db`). Excepción consciente: el controller crea/borra la sesión (`createSession`/`deleteSession`) directo contra `@pair/db`, sin pasar por el service — es mecánica de cookie/HTTP, no lógica de negocio de auth.
- **`/dashboard` es un placeholder** (saluda por email + botón salir): el dashboard real es un ítem de roadmap posterior, construir su UI ahora sería trabajo descartable.
- **Cookie de 30 días, sin renovación.** Valor elegido sin una fuente externa que lo exigiera, ajustable si en la práctica molesta.
- **Error visual sin color nuevo**: `docs/style.md` no define un color de "fallo" (ember es "esto se puede accionar", no error). El mensaje de `AuthError` en el form usa texto plano `--ink` con un `×` de prefijo en vez de improvisar un token de color nuevo.
- **Sin Vitest para `auth-service.ts` por ahora.** Se prueba a mano contra Postgres real (ver checklist). Menos piezas nuevas de una sola vez para la primera feature del ejercicio guiado; se suma test si el service crece o si un bug de regresión lo justifica.

## Checklist de implementación

Orden sugerido (de adentro hacia afuera: primero lo que no depende de nada, al final lo que junta todo). Se detalla archivo por archivo en plan mode antes de empezar a escribir.

- [ ] `AuthError` en `packages/core/src/errors.ts`
- [ ] `findUserById` en `packages/db/src/repositories/users.ts` (falta para resolver el email desde la sesión)
- [ ] `apps/web/src/lib/session.ts` (cookie + `getSession`/`requireSession`)
- [ ] `apps/web/src/services/auth-service.ts` (`signUp`/`logIn`)
- [ ] Rutas `(auth)/login`, `(auth)/signup`, `(app)/dashboard`, gate en `/`
- [ ] Probado end-to-end contra Postgres real: signup, login (ok e incorrecto), email repetido, password corta, logout, los tres gates de sesión
