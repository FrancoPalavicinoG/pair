# Spec: Transport MCP real + tool `get_started`

Roadmap: P3 (MCP y conectores), ítem "`apps/mcp` sobre Streamable HTTP, sesión → usuario"
Estado: hecho

## Objetivo

Que `apps/mcp` exponga un endpoint MCP real (`/mcp`, Streamable HTTP) que resuelve cada request al `userId` de PAIR vía el access token del Authorization Server (ya construido). Primera tool expuesta: `get_started`, sin argumentos, que Claude debe llamar antes que cualquier otra — le explica cómo razonar e interactuar con Garmin a través de PAIR (el patrón preview→confirm, qué puede hacer con los scopes de esta sesión) y le da el estado real de la conexión Garmin del usuario.

Salida observable: un cliente MCP de prueba (`@modelcontextprotocol/inspector`, por fin aplicable — necesita un endpoint `/mcp` real para descubrir el AS, que hasta ahora no existía) completa OAuth de punta a punta, llama `get_started`, y ve el contenido correcto más el estado real de una cuenta.

## Alcance

**Entra**: instalar `@modelcontextprotocol/hono` + `@modelcontextprotocol/server` (confirmados como los paquetes v2 vigentes durante la investigación de Plan 1, versión exacta a confirmar contra npm al implementar), montar `/mcp` verificando el bearer token con `verifyAccessToken` (ya existe en `apps/mcp/src/oauth/provider.ts`), la tool `get_started` completa, setear el campo `instructions` del handshake de MCP como puntero corto (belt-and-suspenders: Claude Code lo lee, Claude Desktop hoy no — issue abierto, no confiar solo en esto), y la prueba real con el inspector (incluye resolver el tema de Node 22 que quedó pendiente de Plan 1/2).

**No entra**: ninguna tool de datos (`list_activities`, `get_daily_metrics`, etc.) ni de escritura (`workout_*`) — esas son su propio spec, según ya está en `docs/roadmap.md`. `get_started` no necesita que existan para ser útil: orienta y da estado, no depende de las demás tools.

## Diseño

### Contenido de `get_started`: qué le decimos a Claude

Decidido en conversación con el usuario. Vive en su **propio archivo**, separado del wiring — pensado para editarse como un doc, no como código:

1. **Quién es quién**: el usuario (vía Claude) decide, PAIR traduce y ejecuta — Claude no le devuelve la decisión al usuario innecesariamente ni actúa con criterio propio sobre el plan.
2. **La regla que no se rompe nunca**: preview → confirm en toda escritura, sin excepciones aunque el usuario pida saltarlo. El `preview_token` es de un solo uso y vence rápido.
3. **Estado real de la conexión Garmin ahora mismo** (dinámico): conectado / token vencido / sincronizando. Si no está conectado, decirlo antes de intentar cualquier otra tool.
4. **Qué puede hacer esta sesión puntual** (dinámico, según `scopes` del `AuthInfo` del token): si falta `workouts:write`, ni mencionar el patrón de preview→confirm — no aplica y genera ruido.
5. **Cómo responderle al usuario**: unidades y zona horaria del usuario, no las crudas de Garmin (min/km, no m/s) — mismo criterio que ya rige la UI en `apps/web/CLAUDE.md`.
6. **Qué hacer con un error de tool**: pasarle al usuario el mensaje ya traducido ("tu sesión de Garmin caducó, reconectá desde el dashboard"), nunca inventar un diagnóstico ni mostrar un stack trace.

Explícitamente **fuera** por ahora: dog factor, historial de fuerza, zonas de esfuerzo — no existen (P5). Se agregan a este contenido en el mismo cambio que agregue esas tools, mismo criterio que ya sigue la tabla de tools de `apps/mcp/CLAUDE.md` ("toda tool nueva se añade en el mismo cambio que la implementa").

**Mecanismo del archivo**: un `.ts` que exporta el texto estático como constante (template literal), no un `.md` leído en runtime con `fs.readFileSync`. Un `.md` real se ve más "como doc", pero complica el empaquetado de `tsup` (¿se copia al `dist/`? ¿con qué ruta relativa en producción?) sin necesidad — un archivo `.ts` sin lógica, solo el string, cumple el mismo objetivo de "fácil de leer/editar" sin ese problema. Nombre propuesto: `apps/mcp/src/tools/get-started-content.ts`.

**Tool sin scope propio**: `get_started` no expone datos de Garmin, solo orientación + un estado de conexión (que no es sensible en sí mismo). Cualquier token válido puede llamarla, sin importar qué scopes tenga.

### Reuso: `deriveGarminStatus` pasa a ser de dos consumidores

Hoy `deriveGarminStatus`/`GarminStatus` viven solo en `apps/web/src/lib/garmin-status.ts`. `get_started` necesita la misma lógica (credenciales → estado), y `apps/mcp` no puede importar de `apps/web`. Mismo criterio que ya promovió `packages/sync` cuando `apps/web` se volvió el segundo controller que lo necesitaba: **se mueve `deriveGarminStatus` + el tipo `GarminStatus` a `packages/db`** (no a `packages/core`, que no puede depender de tipos de `packages/db` — regla de dirección de dependencias del monorepo), re-exportado desde `@pair/db`. `apps/web/src/lib/garmin-status.ts` importa de ahí en vez de definirlo; `requireGarminConnection()` (que sí necesita `next/navigation`) se queda donde está, específico de la web.

### Transport

`WebStandardStreamableHTTPServerTransport` de `@modelcontextprotocol/server`, no `createMcpHandler`. Se investigó `createMcpHandler` primero (parecía el atajo correcto), pero confirmado contra el `.d.ts` real: sirve el protocolo 2025-11-25 en modo `legacy: 'stateless'` (sin sesión) por diseño, y en ese modo responde `405` a `GET`/`DELETE` — un cliente real abre ese `GET` para el canal de push del servidor y no tolera el rechazo (se confirmó con el inspector real: quedaba "Disconnected" sin poder listar tools). La solución fue armar la sesión a mano en `apps/mcp/src/mcp-session.ts`: `Map` en memoria de `sessionId → transport`, un `McpServer` nuevo por sesión, `sessionIdGenerator` real. Detalle y limitación conocida (sin TTL de sesiones abandonadas) documentados en `apps/mcp/CLAUDE.md`.

La verificación de bearer token es nuestra: extraer el header `Authorization` en `apps/mcp/src/index.ts`, llamar `verifyAccessToken` (ya existía), pasar el `AuthInfo` resultante a `handleMcpRequest`. Sin `requireBearerAuth` del SDK (es Express, y ya decidimos no depender de los paquetes de auth del SDK — mismo razonamiento de Plan 1). `AuthInfo` ahora se importa directo de `@modelcontextprotocol/server` (confirmado que el shape que se había hand-rolleado en Plan 1 calzaba exacto) en vez de mantenerse duplicado a mano.

CORS: `/mcp` necesita `hono/cors` explícito. Un cliente MCP corriendo en un navegador (el inspector web) llama desde otro origen con headers custom (`Authorization`, `Mcp-Session-Id`) — sin el middleware, el preflight `OPTIONS` caía en nuestro propio chequeo de bearer token (401, sin headers CORS) y el navegador bloqueaba la respuesta del lado del cliente aunque el servidor contestara bien. Se ve como un timeout confuso en el cliente, no como un error de CORS explícito.

`instructions` del handshake: una línea corta ("Antes de usar cualquier otra tool de PAIR, llamá a `get_started`"). No duplica el contenido completo — ese vive en la tool.

## Checklist de implementación

- [x] Confirmar versiones reales de `@modelcontextprotocol/hono` y `@modelcontextprotocol/server` contra npm (2.0.0 ambos)
- [x] Mover `deriveGarminStatus`/`GarminStatus` a `packages/db` (en `repositories/garmin-credentials.ts`, sale gratis por el `export *` existente), actualizar los 3 call sites de `apps/web`
- [x] `apps/mcp/src/tools/get-started-content.ts` + `get-started.ts`
- [x] Montar `/mcp` en `apps/mcp/src/index.ts` + `mcp-session.ts` (sesión real, no `createMcpHandler` — ver nota de Diseño), verificación de bearer token, `instructions` seteado, CORS
- [x] Actualizar la tabla de tools de `apps/mcp/CLAUDE.md` con `get_started`
- [x] Resolver Node ≥22.19 para el inspector (`fnm`, sin reemplazar el Node 20 del resto del proyecto)
- [x] Probado de punta a punta: DCR + PKCE + consentimiento + token + `initialize`/`GET`/`notifications`/`tools/list`/`tools/call`/`DELETE` reales, contenido y estado correctos, con un cliente automatizado real (`fetch` nativo de Node). El inspector corriendo en un navegador real también completó el flujo (incluida la parte de OAuth) pero con demoras inconsistentes de 5-60s en las llamadas al protocolo MCP en sí — no reproducidas con `curl`, Node `http.Agent` ni `fetch` nativo contra el mismo servidor, mismo token, mismo flujo. Documentado como posible problema del cliente/entorno, no bloqueante — se revisita si vuelve a aparecer probando con Claude Desktop/Code real.
- [x] Marcar el ítem de `docs/roadmap.md` como hecho

## Preguntas abiertas

Ninguna.
