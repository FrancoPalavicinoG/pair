# P.AI.R

**Your Garmin has data. Now it has a pair.**

Tu Garmin Connect, a tu manera. Sube la foto de un entrenamiento o pídeselo a Claude en una frase, y queda creado y agendado en tu cuenta, listo para bajar al reloj. Sin abrir la app, sin escribir un paso a mano.

## Qué hace

- **Conéctate desde Claude Desktop o Claude Code.** Un conector MCP con OAuth: pega una URL y listo, sin tokens a mano.
- **Carga entrenamientos de forma amigable.** Envía una foto o una instrucción en texto a Claude; te muestra el resumen y, con tu confirmación, queda agendado en Garmin.
- **Consulta tu Garmin.** Actividades, sueño, FC en reposo, body battery: pregúntale a Claude en una conversación, sin buscar en seis pantallas de la app.
- **Dashboard web propio.** Conecta tu cuenta Garmin, gestiona el conector y consulta tus métricas desde un solo lugar.

## Stack

- **Backend / MCP**: TypeScript, `@modelcontextprotocol/sdk` sobre Streamable HTTP
- **Frontend**: Next.js 16
- **Base de datos**: Postgres + Drizzle
- **Validación**: Zod en cada borde del sistema
- **Auth Garmin**: sidecar Python (FastAPI + `garth`), solo resuelve el SSO
- **Monorepo**: pnpm + Turborepo

## Estructura del repo

```
pair/
├─ CLAUDE.md
├─ .claude/
│  └─ commands/        garmin-endpoint, new-mcp-tool
├─ apps/
│  ├─ web/              Next.js 16: dashboard, onboarding, consentimiento OAuth
│  └─ mcp/              Servidor MCP remoto + Authorization Server OAuth
├─ services/
│  └─ garmin-auth/      FastAPI + garth: login, MFA y refresh de tokens
├─ packages/
│  ├─ core/              DSL de workouts, traductor a JSON de Garmin, cliente REST, rate limiter
│  └─ db/                Drizzle: schema, migraciones, cliente Postgres
└─ docs/                 Arquitectura, memoria de la API de Garmin, DSL de workouts
```

