# Setup — creación del monorepo desde cero

Se ejecutó por primera vez en P1 (2026-08-14). Después queda como referencia para reproducir el entorno.

**Versiones reales verificadas (2026-08-14)**: Node 20.19.0, pnpm 10.33.4. No Node 22 LTS disponible en la máquina de desarrollo (solo `node@20` vía Homebrew); Node 20 sigue siendo válido para lo que necesita el proyecto, se documenta acá como la versión real en vez de forzar una instalación extra sin necesidad concreta.

**Cambio de alcance (P1, MVP)**: se decidió arrancar sin Turborepo ni Redis/BullMQ — ver `docs/roadmap.md`, sección P1. Se agregan cuando el volumen o la necesidad de reproducibilidad lo pidan, no antes.

## 0. Requisitos

- Node 20+ + corepack (`corepack enable`), pnpm (10.x verificado)
- Python 3.12 + `uv`
- Docker (Postgres en local; Redis se suma cuando entre BullMQ, no en el MVP de P1)

## 1. Raíz del monorepo

```bash
mkdir pair && cd pair && git init
pnpm init
pnpm add -Dw typescript @types/node prettier eslint typescript-eslint
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`services/garmin-auth` queda fuera del workspace: no es un paquete Node.

Sin Turborepo por ahora: scripts de npm normales en el `package.json` raíz (`typecheck` → `pnpm -r --if-present run typecheck`, `lint` → `eslint .`, `format` → `prettier --check .`, `db:*` delegando a `packages/db`). Si el número de paquetes o la necesidad de cachear tareas lo justifica más adelante, se suma Turborepo como cambio deliberado, no de entrada.

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

## 9. Orden de arranque en local (P1)

```bash
docker compose up -d              # postgres (redis se suma con BullMQ, más adelante)
pnpm db:migrate
cd services/garmin-auth && uv run fastapi dev app/main.py   # :8000
pnpm sync --user X                # script de sync incremental, sin apps/web ni apps/mcp todavía
```

`apps/web`, `apps/mcp` y `pnpm dev` llegan en P2/P3 — no forman parte del arranque local de P1.

## 10. Verificación del scaffold (P1)

- [x] `pnpm typecheck` limpio en todo el workspace
- [x] `pnpm lint` y `pnpm format` limpios
- [ ] Una migración vacía aplica y revierte
- [ ] `services/garmin-auth` responde a `/health`
- [x] `.gitignore` cubre `.env*`, `node_modules`, `.next`, `__pycache__`, `.venv`
