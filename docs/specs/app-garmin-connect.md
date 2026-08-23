# Spec: Onboarding — conectar Garmin con MFA desde la UI

Roadmap: P2 (Web app), segundo ítem ("Onboarding: conectar Garmin con MFA desde la UI")
Estado: draft

## Objetivo

Que un amigo ya logueado en PAIR conecte su cuenta de Garmin (email + contraseña, con MFA si Garmin lo pide) desde `/settings/garmin`, y que esas credenciales queden cifradas en `garmin_credentials`, listas para que el sync las use.

Salida observable: formulario de credenciales de Garmin; si Garmin pide MFA, un segundo paso pide el código; al terminar, la fila de `garmin_credentials` del usuario existe y está cifrada.

## Alcance

**Entra**: la ruta, el formulario de dos pasos, la llamada al sidecar (login → mfa si hace falta), guardar las credenciales cifradas.

**No entra** (diferido, no es una omisión):
- Sync inicial y su estado visible ("sincronizando por primera vez"): es el ítem siguiente del roadmap ("Estado de sincronización visible y reconexión"), que es exactamente ese problema.
- Reconexión cuando las credenciales expiran: mismo ítem siguiente.
- Vista `/settings/connectors` (URL del MCP, conectores): P3.
- Mapeo de cada código de error de Garmin a un mensaje distinto: mensaje genérico por ahora (ver Diseño).

## Diseño

- **Reusar `@pair/sync` tal cual, sin reimplementar nada**: `performLogin`, `performMfa` y `saveCredentials` ya existen y ya están probados en P1 contra una cuenta real (el script `pnpm sync` los usa hoy). Esta feature es sobre todo wiring de UI sobre lógica que ya funciona, no lógica nueva de Garmin.
- **Un solo formulario, estado en el server** (mismo patrón que `AuthForm`/`useActionState`, no un wizard con estado de cliente): el Server Action devuelve un estado que puede ser `{ status: "mfa_required", sessionId }`, `{ status: "error", message }`, o nada (éxito → redirect). El `sessionId` de MFA (efímero, TTL de 5 min en el sidecar) viaja en un campo hidden del form entre el primer submit y el segundo, no en la sesión de PAIR ni en ningún lado persistente.
- **Componente de formulario nuevo, no reutiliza `AuthForm`**: la forma no es la misma (acá hay un campo condicional según el paso, `AuthForm` es siempre email+password fijo). Queda como posible refactor a futuro extraer un input de texto compartido si aparece un tercer formulario con el mismo estilo — no ahora, no se justifica con dos casos que ya son distintos en estructura.
- **La Server Action valida la sesión ella misma** (`requireSession()`), no confía en que el gate de `(app)/layout.tsx` ya lo filtró — es la misma regla de seguridad que ya vimos con los Server Actions de login/signup (endpoint público, se revalida adentro), pero acá importa más: sin esto, cualquiera podría invocar la action directo y guardar credenciales de Garmin bajo un `userId` ajeno.
- **Mensaje de error genérico**: se muestra el `message` que ya trae `GarminApiError` (que a su vez ya incluye el code que devolvió el sidecar: `INVALID_CREDENTIALS`, `MFA_INVALID`, `RATE_LIMITED`, `SSO_CHANGED`, `SESSION_EXPIRED`). Sin mapeo a textos amigables por ahora; se afina si en la práctica confunde.
- **Al conectar con éxito, redirect a `/dashboard`.** El dashboard sigue siendo el placeholder de la spec anterior; mostrar "Garmin conectado" ahí queda para el ítem de estado de sincronización.
- **El camino de MFA se implementa igual, pero queda sin probar end-to-end por ahora**: la cuenta de prueba de P0/P1 no tiene MFA activo. Se prueba de verdad el camino feliz (sin MFA) contra una cuenta real; el camino con MFA se verifica la primera vez que alguien con MFA activo conecte su cuenta, no antes. No es una omisión del código, es una limitación de qué se puede probar hoy.

## Checklist de implementación

- [ ] `(app)/settings/garmin/actions.ts`: Server Action que valida sesión, llama `performLogin`/`performMfa` según el paso, y `saveCredentials` al tener tokens
- [ ] Componente de formulario de dos pasos (nuevo, `(app)/settings/garmin/_components/`)
- [ ] `(app)/settings/garmin/page.tsx`
- [ ] Link desde `/dashboard` a `/settings/garmin`
- [ ] Probado end-to-end contra una cuenta de Garmin real (regla dura de `CLAUDE.md` raíz: nunca contra fixtures ni mocks para esto): conexión sin MFA, credenciales cifradas visibles en `garmin_credentials` (vía `pnpm db:studio`), password de Garmin incorrecta muestra error
- [ ] Camino de MFA implementado y revisado, marcado explícitamente como pendiente de prueba real hasta tener una cuenta con MFA activo
