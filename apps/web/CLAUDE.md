# apps/web

Next.js 16 (App Router), React 19, TypeScript, Tailwind. Es el dashboard y el punto de entrada de todo usuario no técnico.

## Superficies

| Ruta | Qué es |
|---|---|
| `/onboarding` | Alta y conexión de Garmin (email, password, MFA) |
| `/dashboard` | Métricas y actividades. Widgets configurables (P4) |
| `/workouts` | Entrenamientos creados y agendados, con su origen (manual o vía Claude) |
| `/connectors` | URL del MCP, instrucciones por cliente, estado de la conexión, revocar |
| `/oauth/consent` | Pantalla de autorización cuando Claude pide acceso |

## Reglas

- Server Components por defecto. `"use client"` solo donde hace falta interactividad real.
- La contraseña de Garmin viaja del formulario a la ruta de servidor y de ahí a `garmin-auth`. **No se guarda en estado de cliente, no se loguea, no se persiste.** Tras obtener tokens, se descarta.
- El formulario de MFA no reenvía credenciales: usa el `session_id` que devolvió `/login`.
- Nunca llames a `garmin-auth` ni a Garmin desde el cliente. Todo pasa por rutas de servidor.
- Toda query filtra por el `user_id` de la sesión. Nunca aceptes un `userId` desde el cliente.
- La página de conectores es para gente no técnica: la URL con botón de copiar, pasos por cliente (Claude Desktop / Claude Code / otro), y en lenguaje llano qué puede hacer Claude y qué pedirá confirmación. Sin jerga de OAuth.
- Estados vacíos y de error explícitos, sobre todo "Garmin desconectado" y "sincronizando por primera vez": la primera sincronización tarda y sin feedback parece rota.
- Los datos deportivos se muestran con unidades y zona horaria del usuario. Ritmo en min/km, no en m/s.

## Dashboard configurable (P4)

El layout y las métricas custom viven en DB, no en `localStorage`. Un widget es: fuente de datos + transformación + visualización. Antes de añadir el segundo tipo de widget, definir esa abstracción; antes no.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
