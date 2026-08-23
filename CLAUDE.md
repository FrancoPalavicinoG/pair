# PAIR — Contexto del proyecto

PAIR conecta Garmin Connect con Claude. Tres piezas:

1. **Gateway Garmin** — capa que autentica contra Garmin Connect (API no oficial) y normaliza datos y acciones.
2. **MCP Server remoto** — expone el gateway a Claude Desktop / Claude Code vía OAuth, con una URL única.
3. **Dashboard web** — onboarding, conexión de cuenta Garmin, vista de conectores, métricas personalizables.

Caso de uso guía: el entrenador manda una foto del entrenamiento → Claude la interpreta → llama al MCP → el workout queda creado y agendado en Garmin y baja al reloj en el siguiente sync.

**Escala objetivo**: multiusuario cerrado (círculo de amigos, decenas de usuarios). No es un producto público. No optimices para escala que no existe, pero tampoco escribas código single-tenant: todo dato es por `user_id`.

---

## Estado

Fase actual: **P1 (gateway y datos), MVP**. Ver `docs/roadmap.md`.
Nada de lo que está fuera de la fase actual debe implementarse sin discutirlo primero.

---

## Arquitectura

Monorepo pnpm workspaces. TypeScript en todo, salvo un sidecar Python mínimo. Sin Turborepo por ahora (ver `docs/roadmap.md`, P1 MVP).

```
apps/web/                Next.js 16 (App Router): dashboard, onboarding, pantalla de consentimiento OAuth (P2, en construcción)
apps/mcp/                Servidor MCP remoto (Streamable HTTP) + Authorization Server OAuth (P3, no existe aún)
services/garmin-auth/    FastAPI + garth. SOLO login, MFA y refresh de tokens.
packages/db/             Drizzle: schema, migraciones, repositorios
packages/core/           Cliente REST de Garmin en TS, rate limiter, errores tipados (DSL de workouts llega en P3)
packages/sync/           Service de sync: login/refresh de credenciales, trae actividades y métricas diarias
packages/config/         tsconfig, eslint, prettier compartidos
scripts/                 sync.ts: Controller de CLI sobre packages/sync
```

**Regla de fronteras**: `services/garmin-auth` devuelve tokens y nada más. Toda llamada de datos a Garmin se hace desde `packages/core` en TypeScript con el bearer. Si te encuentras añadiendo un endpoint de datos al sidecar Python, párate y pregunta.

**Patrón interno: Controller-Service-Repository.** Todo punto de entrada (script, tool de MCP, ruta de la web) separa Controller (input/output, sin lógica) / Service (lógica de negocio) / Repository (acceso a la DB, solo `packages/db/src/repositories/`). Misma convención de carpetas en TS y en Python. Detalle en `docs/architecture.md`.

Detalle de componentes, flujos y despliegue en `docs/architecture.md`. Cómo se crea cada paquete desde cero en `docs/setup.md`.

---

## Comandos

```bash
pnpm sync --user <email>  # sync incremental contra Garmin (P1)
pnpm typecheck             # tsc --noEmit en todo el monorepo
pnpm lint
pnpm format
pnpm db:generate           # genera migración desde el schema de Drizzle
pnpm db:migrate            # aplica migraciones
pnpm db:studio
```

`pnpm dev` y `pnpm test` llegan cuando existan `apps/web`/`apps/mcp` y una suite de tests (no en el MVP de P1).

---

## Convenciones

- **TypeScript estricto**. `any` prohibido; si no sabes el tipo, usa `unknown` + validación Zod.
- **Zod en todos los bordes**: respuestas de Garmin, inputs de tools MCP, body de rutas API, variables de entorno.
- Los tipos de dominio viven en `packages/core`. La web y el MCP los importan, no los redefinen.
- Errores: nunca `throw new Error("algo falló")`. Usa las clases de `packages/core/src/errors.ts` con causa y código.
- Nombres en inglés en el código, comentarios y docs en español.
- Componentes React: server components por defecto, `"use client"` solo cuando hace falta interactividad.
- Diseño visual de `apps/web` (paleta, tipografía, voz, gráficos, motion): sigue `docs/style.md`. No inventar patrones visuales nuevos dentro de un componente; si falta uno, agregarlo ahí primero.
- Tests: Vitest. Todo lo que traduce (DSL → Garmin) o parsea (Garmin → dominio) va con test de fixture. Fixtures reales anonimizados en `packages/core/test/fixtures/`.

---

## Reglas duras

Estas no se negocian. Si una tarea parece requerir romperlas, para y pregunta.

1. **Nunca** loguees, imprimas ni escribas a disco: contraseñas Garmin, códigos MFA, tokens OAuth1/OAuth2, cookies de sesión. Ni siquiera en debug. Los tokens se referencian por `credential_id`, jamás por valor.
2. **Nunca** commitees `.env*`, dumps de DB ni fixtures con datos reales sin anonimizar.
3. **Nunca** llames a la API de Garmin desde tests. Usa fixtures. Garmin banea por volumen y no hay entorno de staging.
4. Toda escritura a Garmin (crear/agendar/borrar workout, subir actividad) pasa por el patrón **preview → confirm**. Ver `apps/mcp/CLAUDE.md`.
5. No modifiques migraciones ya aplicadas. Crea una nueva.
6. Al descubrir cualquier cosa sobre la API no oficial de Garmin (endpoint, payload, error raro, cambio de comportamiento), **escríbelo en `docs/garmin-api.md` en el mismo cambio**. Ese archivo es la memoria del proyecto; si no está ahí, se pierde.
7. Rate limiting siempre activo contra Garmin: máximo configurado en `packages/core/src/garmin/limiter.ts`. Nunca hagas fan-out de requests sin cola.

---

## Cómo quiero trabajar contigo

- **Spec antes de plan.** Para cada ítem de `docs/roadmap.md`, primero un spec corto en `docs/specs/` (plantilla en `docs/specs/TEMPLATE.md`: objetivo, alcance, diseño, checklist, preguntas abiertas) que revisamos juntos. El spec queda en el repo como memoria de qué se construyó y por qué; recién después entra plan mode para el cómo (archivo por archivo) de esa sesión puntual, que no hace falta persistir.
- **Plan antes de código.** Para cualquier cambio que toque más de un archivo, usa plan mode y espera aprobación.
- **Código nuevo de aprendizaje: el usuario escribe la lógica, tú preparas el molde.** Desde P2 (auth) en adelante, antes de que el usuario escriba, explica el concepto y las alternativas con su trade-off. Preparas el archivo con el andamiaje: si es nuevo, lo creas; si ya existe, agregas el molde en el lugar que corresponde (imports, firmas de función/clase y los comentarios explicativos que le tocarían a esa pieza, sin cuerpo — el TODO de la lógica queda para el usuario). El usuario completa la lógica dentro de ese molde: ni tú armas todo (no es vibe-coding) ni el usuario pierde tiempo en boilerplate que no enseña nada. Si hace falta, da un ejemplo aislado, no el código final de esa pieza. Si el usuario se traba o tiene un error de lógica o de diseño (qué validar, qué devolver, mensajes de error, seguridad), ayuda a debuggear guiando el razonamiento (qué mirar, qué probar), sin resolverlo directo. Un error mecánico de sintaxis (nombre de variable que choca con otra ya declarada, variable mal referenciada, typo) lo corrige directo, sin preguntar — no enseña nada dejárselo al usuario. Revisa el código una vez escrito. No aplica a scaffolding mecánico (carpetas, configs) ni a código de fases ya cerradas.
- Si una decisión tiene alternativas razonables, no elijas en silencio: propón A/B con el trade-off en dos líneas y pregunta. Si es estructural y la aprobamos, refléjala en `docs/architecture.md` en el mismo cambio.
- Respuestas breves. Sin resúmenes de lo que acabas de hacer si ya se ve en el diff.
- Si no sabes algo de la API de Garmin, dilo y propón cómo verificarlo. No inventes endpoints ni IDs numéricos: la mitad de los bugs de este proyecto van a venir de constantes inventadas.
- Prefiero un archivo bien tipado a tres archivos "por si acaso". No crees abstracciones antes del segundo caso de uso.

---

## Seguridad

Detalle operativo en el `CLAUDE.md` de cada paquete. Los invariantes:

- La contraseña de Garmin y el código MFA existen solo en memoria durante la petición. Nunca en DB, logs, estado de cliente ni fixtures.
- La contraseña propia de PAIR (auth de usuario, P2) se guarda siempre hasheada (argon2 o bcrypt), nunca en texto plano ni reversible. No es lo mismo que la contraseña de Garmin de la regla anterior.
- Los tokens se cifran en reposo con clave derivada por usuario; la clave maestra vive en el entorno, nunca en la DB. En código se referencian por `credential_id`.
- El sidecar `garmin-auth` solo es accesible desde la red interna, con secreto compartido entre servicios.
- Aislamiento multiusuario: toda query filtra por el `user_id` de la sesión. Nunca se acepta un identificador de usuario desde el cliente ni desde los argumentos de una tool MCP.
- Superficie expuesta al LLM: lo que una tool no expone, no puede filtrarse. Ante la duda, no la expongas.
- Toda invocación de tool MCP queda auditada con argumentos redactados.

## Comandos de Claude Code

| Comando | Cuándo |
|---|---|
| `/garmin-endpoint <qué necesito>` | Antes de escribir cualquier código que llame a Garmin. Investiga y documenta en `docs/garmin-api.md` |
| `/new-mcp-tool <nombre y propósito>` | Al añadir una tool al servidor MCP. Checklist completo |

## Glosario

- **garth**: librería Python que resuelve el SSO de Garmin (login, MFA, OAuth1→OAuth2). Base del sidecar.
- **DSL / PairWorkout**: nuestro formato simplificado de entrenamiento. Es lo que Claude produce desde una foto. Ver `docs/workout-dsl.md`.
- **Preview token**: identificador efímero que devuelve `workout_preview` y consume `workout_create`. Implementa el "visto bueno" del usuario.
- **Conector**: la vista de la web que entrega la URL del MCP y gestiona la autorización, equivalente a lo que ve el usuario en Claude Desktop.
