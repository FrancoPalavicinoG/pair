# apps/web

Next.js 16 (App Router), React 19, TypeScript, Tailwind. Es el dashboard y el punto de entrada de todo usuario no técnico.

Todo componente y toda decisión visual sigue `docs/style.md` (paleta, tipografía, voz, componentes, sistema de color de gráficos, motion). Antes de construir un componente nuevo, leer la sección relevante ahí. Si hace falta un patrón visual que ese documento no cubre, no improvisarlo en el componente: agregarlo ahí primero.

## Superficies

| Ruta | Qué es |
|---|---|
| `/onboarding` | Alta y conexión de Garmin (email, password, MFA) |
| `/dashboard` | Widgets configurables (P4), uno por métrica, grilla cuadrada de 3 columnas |
| `/activities` | Lista completa de actividades sincronizadas |
| `/workouts` | Entrenamientos creados y agendados, con su origen (manual o vía Claude) |
| `/connectors` | URL del MCP, instrucciones por cliente, estado de la conexión, revocar |
| `/oauth/consent` | Pantalla de autorización cuando Claude pide acceso |

## Estructura visual

Toda superficie autenticada (grupo de rutas `(app)`) vive dentro del shell de escritorio: `(app)/_components/app-shell.tsx` (sidebar fijo + wordmark + nav) envuelve `children` desde `(app)/layout.tsx`. Ninguna página del grupo `(app)` vuelve a centrar su propio contenido en una columna angosta — eso es contrato del shell, no de cada página (ver `docs/style.md`, "Layout de escritorio"). Las pantallas de `(auth)` (login/signup) quedan fuera del shell, como card centrada.

`src/components/` (fuera de `app/`) tiene los componentes de marca compartidos entre rutas (`wordmark.tsx`, `eyebrow.tsx`, `pair-button.tsx`, `list-row.tsx`) — sin estado, transcripción directa de `docs/style.md`. Un componente específico de una sola ruta sigue viviendo en el `_components/` de esa ruta.

**Regla de reuso**: un patrón visual usado 2 veces o más (mismo botón, misma fila, misma tarjeta) se saca a un componente propio en vez de repetir la clase de Tailwind larga a mano en cada archivo — nunca copiar/pegar un `className` de 5+ utilidades entre componentes. Otro componente lo importa siempre, no lo redefine. Ver `PairButton`/`ListRow` como el patrón de referencia: variantes fijas (no props de estilo libre), wrapper delgado sin lógica de negocio, migración de los usos existentes en el mismo cambio que crea el componente.

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

El layout y las métricas custom viven en DB, no en `localStorage`. Un widget es: fuente de datos + transformación + visualización.

`dashboard/_components/widgets/registry.ts` tiene dos partes: un `Record` estático (`FIXED_WIDGET_REGISTRY`) para los widgets de key fija, y `getWidgetEntries(userId)` que le suma widgets calculados en tiempo de render a partir del dato real del usuario (hoy: uno por deporte que aparece en su semana, key compuesta `weekly_distance:<sport>`) — no una lista fija de deportes hardcodeada. `getEffectiveLayout(userId)` mezcla el layout guardado con el set actual de `getWidgetEntries`: una key guardada que ya no existe en el registry se ignora, y cualquier widget que el usuario no tiene guardado (layout nuevo, o widget agregado después de su último guardado) aparece visible por default. Ver `docs/specs/app-dashboard-widgets-v2.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
