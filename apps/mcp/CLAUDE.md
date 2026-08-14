# apps/mcp

Servidor MCP remoto + Authorization Server OAuth. Es lo que el usuario pega en Claude Desktop / Claude Code como URL de conector.

Stack: Node + TypeScript, `@modelcontextprotocol/sdk`, transport Streamable HTTP.

## Tools

Tabla viva. Toda tool nueva se añade aquí en el mismo cambio que la implementa.

| Tool | Scope | Efecto |
|---|---|---|
| `garmin_status` | — | Estado de la conexión del usuario con Garmin |
| `list_activities` | `activities:read` | Actividades por rango de fechas, resumidas |
| `get_activity` | `activities:read` | Detalle de una actividad |
| `get_daily_metrics` | `metrics:read` | Sueño, FC en reposo, pasos, body battery por día |
| `list_workouts` | `workouts:read` | Entrenamientos creados y agendados |
| `workout_preview` | `workouts:write` | Valida un PairWorkout y devuelve resumen + `preview_token`. Sin efecto |
| `workout_create` | `workouts:write` | Consume el token y crea el workout en Garmin |
| `workout_schedule` | `workouts:write` | Agenda un workout existente en una fecha. Requiere token de `workout_preview` |
| `workout_delete` | `workouts:write` | Borra. Requiere token de un preview de borrado |

## Scopes

`activities:read`, `metrics:read`, `workouts:read`, `workouts:write`. El usuario los ve en la pantalla de consentimiento en lenguaje llano, no con estos identificadores.

## Reglas

- **Ninguna tool escribe en Garmin en un solo paso.** Patrón obligatorio: `*_preview` (idempotente, sin efectos, devuelve resumen legible + `preview_token` con TTL corto) → `*_create|update|delete` (consume el token y lo invalida). Esto es lo que hace cierta la promesa de la pantalla de conectores: nada sensible sale sin visto bueno.
- Cada tool declara su scope y lo verifica contra el token de la sesión. Un token de solo lectura no puede llegar a una tool de escritura ni por error de routing.
- La sesión MCP resuelve un `user_id`. Toda lectura de DB filtra por él. Nunca confíes en un identificador que venga en los argumentos de la tool.
- Las `description` de las tools son la interfaz real con Claude. Escriben *cuándo* usar la tool y *cuándo no*. Una description ambigua se traduce en llamadas equivocadas, no en un error de compilación.
- Las salidas son para un LLM: texto legible y compacto, unidades explícitas, sin IDs internos que Claude no pueda usar, sin volcados JSON gigantes. Paginar y resumir.
- Los errores de Garmin se traducen a mensajes accionables para el usuario final ("tu sesión de Garmin caducó, reconéctala en el dashboard"), nunca stack traces.
- Toda invocación de tool se registra en `mcp_audit_log`: usuario, tool, argumentos redactados, resultado. Sin auditoría no hay forma de saber qué hizo un modelo con la cuenta de alguien.
- Rate limiter de `packages/core` siempre. El MCP no llama a Garmin directamente.

## OAuth

Claude Desktop requiere OAuth 2.1 con **Dynamic Client Registration** (RFC 7591) y **PKCE**. No lo implementes a mano: usa la librería elegida y limítate a la pantalla de consentimiento y al mapeo scope → tools. Cualquier desviación aquí se paga en horas de depuración a ciegas contra un cliente que no puedes instrumentar.

## Añadir una tool

Usa `/new-mcp-tool`. Recorre el checklist entero y añade la tool a la tabla de arriba en el mismo cambio.
