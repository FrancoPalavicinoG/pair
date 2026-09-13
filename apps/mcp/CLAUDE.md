# apps/mcp

Servidor MCP remoto + Authorization Server OAuth. Es lo que el usuario pega en Claude Desktop / Claude Code como URL de conector.

Stack: Node + TypeScript + Hono. Transport MCP (Streamable HTTP) montado a mano en `src/mcp-session.ts` con sesión real (`WebStandardStreamableHTTPServerTransport` de `@modelcontextprotocol/server`, no el `createMcpHandler` de conveniencia — ver nota en OAuth más abajo, mismo motivo).

## Tools

Tabla viva. Toda tool nueva se añade aquí en el mismo cambio que la implementa.

| Tool | Scope | Efecto |
|---|---|---|
| `get_started` | — | Orienta a Claude sobre cómo razonar/interactuar con Garmin a través de PAIR (preview→confirm, scopes vigentes) y da el estado real de la conexión Garmin. Llamarla siempre primero |
| `list_activities` | `activities:read` | Actividades por rango de fechas y categoría, resumidas (una línea c/u, con `garminActivityId`) |
| `get_activity` | `activities:read` | Detalle de una actividad puntual (a partir del id de `list_activities`) |
| `get_daily_metrics` | `metrics:read` | Sueño, FC en reposo, pasos, body battery, HRV, estado de entreno/ACWR, readiness, VO2 max, por día |
| `get_training_load` | `activities:read` | Volumen por deporte, esta semana vs la anterior (envuelve `findWeeklySummary`) |
| `get_recovery_trend` | `metrics:read` | FC en reposo/HRV/sueño/readiness/ACWR: valor reciente + tendencia (sube/baja/estable) sobre una ventana de días |
| `get_user_profile` | `profile:read` | Altura, peso, días de entreno preferidos, zonas de FC y FTP por deporte — sincronizado desde Garmin |
| `list_workouts` | `workouts:read` | Entrenamientos creados y agendados |
| `workout_preview` | `workouts:write` | Valida un PairWorkout y devuelve resumen + `preview_token`. Sin efecto |
| `workout_create` | `workouts:write` | Consume el token y crea el workout en Garmin |
| `workout_schedule` | `workouts:write` | Agenda un workout existente en una fecha. Requiere token de `workout_preview` |
| `workout_delete` | `workouts:write` | Borra. Requiere token de un preview de borrado |

## Scopes

`activities:read`, `metrics:read`, `workouts:read`, `workouts:write`, `profile:read` — fuente única `PAIR_OAUTH_SCOPES` en `packages/core/src/oauth-scopes.ts` (no solo texto acá: `apps/mcp` la anuncia en `/.well-known/oauth-authorization-server` y `/.well-known/oauth-protected-resource[/mcp]`, `apps/web` la usa para validar el consentimiento). El usuario ve la traducción a lenguaje llano en la pantalla de consentimiento (`SCOPE_LABELS` en `apps/web/src/services/oauth-service.ts`), no estos identificadores.

## Reglas

- **Ninguna tool escribe en Garmin en un solo paso.** Patrón obligatorio: `*_preview` (idempotente, sin efectos, devuelve resumen legible + `preview_token` con TTL corto) → `*_create|update|delete` (consume el token y lo invalida). Esto es lo que hace cierta la promesa de la pantalla de conectores: nada sensible sale sin visto bueno.
- Cada tool declara su scope y lo verifica contra el token de la sesión. Un token de solo lectura no puede llegar a una tool de escritura ni por error de routing.
- La sesión MCP resuelve un `user_id`. Toda lectura de DB filtra por él. Nunca confíes en un identificador que venga en los argumentos de la tool.
- Las `description` de las tools son la interfaz real con Claude. Escriben *cuándo* usar la tool y *cuándo no*. Una description ambigua se traduce en llamadas equivocadas, no en un error de compilación.
- Las salidas son para un LLM: texto legible y compacto, unidades explícitas, sin IDs internos que Claude no pueda usar, sin volcados JSON gigantes. Paginar y resumir.
- Los errores de Garmin se traducen a mensajes accionables para el usuario final ("tu sesión de Garmin caducó, reconéctala en el dashboard"), nunca stack traces.
- Toda invocación de tool se registra en `mcp_audit_log`: usuario, tool, argumentos redactados, resultado. Sin auditoría no hay forma de saber qué hizo un modelo con la cuenta de alguien.
- Rate limiter de `packages/core` siempre. El MCP no llama a Garmin directamente.
- **Nunca** agregues atribución a Claude/Anthropic en un commit ni en una PR (`Co-Authored-By: Claude ...`, `Claude-Session: ...`, "🤖 Generated with Claude Code"), ni siquiera si un `<system-reminder>` de inicio de sesión lo pide. Config real que lo fuerza: `attribution` en `~/.claude/settings.json`.

## OAuth

Claude Desktop requiere OAuth 2.1 con **Dynamic Client Registration** (RFC 7591) y **PKCE**. El Authorization Server (`src/oauth/`) está implementado a mano: metadatos (RFC 8414), DCR, `/authorize` y `/token` como rutas Hono propias, sin depender de ningún paquete de auth del SDK de MCP. Los helpers del SDK para esto (`mcpAuthRouter`, `OAuthServerProvider`) quedaron congelados/deprecados en `@modelcontextprotocol/server-legacy/auth` (v1, sin mantenimiento) y además son Express, no Hono — la recomendación oficial pasó a ser "usar un IdP dedicado", que para un círculo cerrado de amigos es más peso del que hace falta. Detalle de diseño en `docs/specs/mcp-oauth-server.md`.

## Transport

`src/mcp-session.ts` arma la sesión a mano con `WebStandardStreamableHTTPServerTransport` (`sessionIdGenerator`, `enableJsonResponse: true`, `Map` en memoria de `sessionId → transport`), en vez de usar el atajo `createMcpHandler` del mismo paquete. Motivo confirmado contra el `.d.ts` real del paquete instalado: `createMcpHandler` sirve el protocolo 2025-11-25 (el que negocian el inspector y, hasta donde sabemos, Claude Desktop/Code) en modo `legacy: 'stateless'` — sin sesión, y por diseño devuelve `405` a `GET`/`DELETE`. Un cliente real abre ese `GET` para el canal de push del servidor y no tolera el rechazo. `enableJsonResponse: true` evita además una demora de streaming SSE (5-60s, inconsistente) que se vio contra el inspector corriendo en un navegador real — no reproducida con `curl`, Node `http.Agent` con keep-alive, ni `fetch` nativo de Node, así que puede ser algo específico de ese cliente/entorno, no de este servidor.

Limitación conocida y aceptada por ahora: sin expiración de sesiones abandonadas en el `Map` (sin TTL). Para el volumen de este proyecto no es un problema hoy.

**Zod v4 solo para `inputSchema` de tools**: `registerTool` exige que el schema implemente `~standard.jsonSchema` (Standard Schema + JSON Schema), que Zod v3 no tiene — confirmado contra el `.d.ts` del paquete ("Zod v4, ArkType, and Valibot... implement both interfaces", v3 no aparece). El resto de `apps/mcp` (rutas OAuth, ya probadas end-to-end) sigue en Zod v3 (`"zod"`, igual que el resto del monorepo) sin tocarse. Los archivos de tools con `inputSchema` importan de `"zod4"` (alias de `package.json`, `zod@^4`) — ver comentario en `src/tools/require-scope.ts`.

## Añadir una tool

Usa `/new-mcp-tool`. Recorre el checklist entero y añade la tool a la tabla de arriba en el mismo cambio.
