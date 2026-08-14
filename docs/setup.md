# Setup — creación del monorepo desde cero

Se ejecuta una vez, en P1. Después queda como referencia para reproducir el entorno.

Fija las versiones reales en este archivo el día que lo ejecutes; lo de aquí son las versiones objetivo, no las verificadas.

## 0. Requisitos

- Node 22 LTS + corepack (`corepack enable`), pnpm 9
- Python 3.12 + `uv`
- Docker (Postgres y Redis en local)

## 1. Raíz del monorepo

```bash
mkdir pair && cd pair && git init
pnpm init
pnpm add -Dw turbo typescript @types/node vitest prettier eslint
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`services/garmin-auth` queda fuera del workspace: no es un paquete Node.

`turbo.json`: tareas `build`, `dev`, `lint`, `typecheck`, `test`, con `db:generate` y `db:migrate` marcadas `"cache": false`.

Scripts en la raíz que envuelven turbo: `dev`, `build`, `typecheck`, `lint`, `test`, y `db:*` delegando a `packages/db`.

## 2. `packages/config`

Base compartida, sin dependencias del resto.

```bash
mkdir -p packages/config && cd packages/config && pnpm init
```

Contiene `tsconfig.base.json` (`strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: "bundler"`, `target: "ES2022"`), config de eslint y de prettier. Todo `tsconfig.json` del repo extiende de aquí.

## 3. `packages/core`

```bash
mkdir -p packages/core && cd packages/core && pnpm init
pnpm add zod
pnpm add -D vitest @pair/config
```

Sin dependencias de DB, red concreta ni entorno. `fetch`, reloj y logger entran por parámetro. Estructura inicial en `packages/core/CLAUDE.md`.

## 4. `packages/db`

```bash
mkdir -p packages/db && cd packages/db && pnpm init
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit @pair/config
```

`drizzle.config.ts` apuntando a `src/schema/*.ts` y a `DATABASE_URL`. Exporta el cliente y los tipos inferidos del schema; nadie más instancia una conexión.

Postgres y Redis en local con un `docker-compose.yml` en la raíz (Postgres 16, Redis 7, volúmenes nombrados).

## 5. `apps/web`

```bash
pnpm create next-app@latest apps/web --ts --tailwind --app --eslint --src-dir --import-alias "@/*"
cd apps/web
pnpm add @pair/core @pair/db zod
```

Después del scaffold: borrar el CSS y el contenido de ejemplo, apuntar `tsconfig.json` a `@pair/config`, y añadir un módulo de validación de variables de entorno con Zod que falle al arrancar si falta alguna.

## 6. `apps/mcp`

Sin generador oficial; se monta a mano.

```bash
mkdir -p apps/mcp && cd apps/mcp && pnpm init
pnpm add @modelcontextprotocol/sdk hono zod @pair/core @pair/db
pnpm add -D tsx tsup @pair/config
```

Servidor HTTP con el transport Streamable HTTP del SDK, más las rutas del Authorization Server. La librería de OAuth (con Dynamic Client Registration y PKCE) se elige y se fija aquí antes de escribir la primera tool: es la decisión que más condiciona este paquete.

## 7. `services/garmin-auth`

```bash
mkdir -p services/garmin-auth && cd services/garmin-auth
uv init --python 3.12
uv add "fastapi[standard]" garth pydantic-settings
uv add --dev pytest ruff
```

Fijar la versión exacta de `garth` en `pyproject.toml`. Actualizarla es un cambio deliberado con prueba manual de login real.

## 8. Variables de entorno

Cada servicio valida las suyas al arrancar y falla ruidosamente si falta una. `.env.example` versionado, `.env` nunca.

| Servicio | Variables |
|---|---|
| `apps/web` | `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_MASTER_KEY`, `GARMIN_AUTH_URL`, `GARMIN_AUTH_SHARED_SECRET`, `AUTH_SECRET` |
| `apps/mcp` | `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_MASTER_KEY`, `OAUTH_ISSUER_URL`, `PUBLIC_MCP_URL` |
| `services/garmin-auth` | `SHARED_SECRET`, `LOG_LEVEL` |

`ENCRYPTION_MASTER_KEY` se genera una vez y se guarda fuera del repo. Perderla significa que todos los usuarios reconectan Garmin desde cero.

## 9. Orden de arranque en local

```bash
docker compose up -d              # postgres + redis
pnpm db:migrate
cd services/garmin-auth && uv run fastapi dev app/main.py   # :8000
pnpm dev                          # web :3000, mcp :3001
```

## 10. Verificación del scaffold

- [ ] `pnpm typecheck` limpio en todo el workspace
- [ ] `pnpm test` corre (aunque no haya tests aún)
- [ ] `apps/web` importa un tipo de `@pair/core` y compila
- [ ] Una migración vacía aplica y revierte
- [ ] `services/garmin-auth` responde a `/health`
- [ ] `.gitignore` cubre `.env*`, `node_modules`, `.next`, `.turbo`, `__pycache__`, `.venv`
