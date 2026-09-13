# Spec: DSL `PairWorkout` + tools de escritura (`workout_preview`/`workout_create`/`workout_schedule`, `list_workouts`)

Roadmap: P3 (MCP y conectores), ítems "DSL `PairWorkout` + traductor + tests", "Tools de escritura con preview → confirm: crear/agendar workouts..." (sin la parte de registrar sets de ejercicio, que depende del historial de P5 — spec aparte) y "`audit_log` de toda escritura".
Estado: draft

## Objetivo

Que Claude pueda crear y agendar un `PairWorkout` real en la cuenta de Garmin del usuario, con visto bueno explícito antes de escribir nada. Es el flujo guía del proyecto: foto de un entrenamiento → Claude interpreta → `workout_preview` → confirmación del usuario → `workout_create`/`workout_schedule` → el workout queda en la cuenta y encolado para el reloj.

También es la pieza que desbloquea `training-plan.md` (P6, adelantado esta sesión): un plan multi-sesión no es más que varios `PairWorkout` que, al aprobarse, pasan por este mismo gate.

Salida observable: con un token `workouts:write`, Claude manda un `PairWorkout` a `workout_preview` y recibe un resumen legible + `preview_token`; al confirmar, `workout_create` crea el workout real en Garmin (verificable en la app); `workout_schedule` lo agenda en una fecha. Cada llamada, exitosa o no, queda en `mcp_audit_log`.

## Alcance

**Entra**:
- `packages/core/src/workout/dsl.ts`: el Zod schema de `PairWorkout` tal como está diseñado en `docs/workout-dsl.md`, pero **acotado a lo que el traductor puede emitir hoy con constantes confirmadas** (ver "Cobertura v1" abajo). Un paso o target fuera de esa cobertura falla la validación con error explícito — nunca se aproxima.
- `packages/core/src/workout/translate.ts`: DSL → JSON de workout de Garmin, siguiendo la forma y constantes ya confirmadas en `docs/garmin-api.md`/`docs/workout-dsl.md`.
- `packages/db`: tablas `workouts`, `workout_previews`, `mcp_audit_log` (prefiguradas en `packages/db/CLAUDE.md`, no creadas todavía).
- Tools: `list_workouts` (`workouts:read`), `workout_preview` (`workouts:write`, sin efecto), `workout_create` (`workouts:write`, consume token), `workout_schedule` (`workouts:write`, consume token de un preview de agendado).
- Audit logging de **todas** las tools, lectura y escritura (falta incluso para las ya mergeadas — se cierra esa deuda en este cambio en vez de partirlo en dos, es plomería chica y la escritura es justo donde más importa tenerla).

**No entra** (diferido, no es una omisión):
- **Resolución de targets por zona** (`hrZone`/`powerZone`/`paceZone` → valor absoluto): depende de que `sport_zones` exista (`garmin-user-profile.md`, P5). Cuando se implemente, vive en la capa de tool, nunca en `translate.ts` (`packages/core` no toca la DB — ver "Diseño" abajo). Mientras tanto, un `PairWorkout` con esos targets falla la validación igual que cualquier target no soportado — no es un caso especial.
- **Targets de FC/potencia/cadencia absolutos** (`hr`, `power`, `cadence` con rango numérico, sin pasar por zona): sus `workoutTargetTypeId` (`heart_rate_zone`=4, `power_zone`=2, `cadence`=3) están marcados **"por confirmar"** en `docs/garmin-api.md` — no se inventan. Se confirman con `/garmin-endpoint` el día que un caso de uso real los necesite.
- `workout_delete`: sin caso de uso todavía (nada que borrar si nada se creó). Se agrega cuando haga falta, mismo patrón preview→confirm.
- Registrar sets de ejercicio de fuerza (peso/reps): depende del historial de P5, spec aparte.
- Cambios a la vista `/workouts` de la web: la ruta ya existe (`apps/web/CLAUDE.md`); mostrar ahí los workouts creados por Claude es iteración aparte si hace falta.

## Diseño

### Cobertura v1 del traductor

Confirmado contra cuenta real (`docs/garmin-api.md`, `docs/workout-dsl.md`):

| Elemento | Constante | Estado |
|---|---|---|
| `sportTypeId` running | `1` | confirmado |
| `stepTypeId` warmup / interval / recovery / repeat | `1` / `3` / `4` / `6` | confirmado |
| `conditionTypeId` time / distance / iterations | `2` / `3` / `7` | confirmado |
| `workoutTargetTypeId` no_target / pace_zone | `1` / `6` | confirmado |
| `stepTypeId` cooldown / rest | — | **por confirmar** |

`docs/workout-dsl.md` ya incluye `cooldown`/`rest` como `kind` válido de `SimpleStep` (y el ejemplo del propio doc usa `cooldown`), pero sus `stepTypeId` nunca se confirmaron con un dump real — no aparecieron en el workout de referencia. **Antes de escribir `translate.ts`, correr `/garmin-endpoint` para confirmar `cooldown`/`rest`** (crear a mano en Garmin Connect un workout con un paso de cada tipo, `GET` y leer el `stepTypeId` real). Sin esto, v1 soporta `warmup`/`work`(interval)/`recovery`/`repeat` con certeza; `cooldown`/`rest` quedan bloqueados hasta confirmar, no aproximados a `other`.

Deporte: solo `running` en v1 (`sportTypeId=1`, el único confirmado). `cycling`/`swimming`/`strength` fallan validación explícita hasta confirmar su `sportTypeId` (la tabla completa sin `✅` en `workout-dsl.md` es de una librería de terceros, no verificada por nosotros).

Target: solo `none` y `pace` (con `targetTypeId=6`, rango `[rápido, lento]` en min/km → convertido a m/s, ya confirmado el redondeo como fuente de bugs en `docs/workout-dsl.md`). El resto de `Target` del DSL (`hr`, `speed`, `hrZone`, `power`, `powerZone`, `cadence`, `paceZone`) rechaza con error explícito en v1.

### `packages/db`: `workouts`, `workout_previews`, `mcp_audit_log`

```ts
// workouts: un registro por workout creado desde PAIR
export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pairWorkout: jsonb("pair_workout").notNull(), // el DSL original, para re-mostrarlo sin volver a traducir
  garminWorkoutId: text("garmin_workout_id").notNull(),
  scheduledDate: date("scheduled_date"), // null hasta que workout_schedule lo agenda
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// workout_previews: token efímero entre *_preview y *_create|schedule
export const workoutPreviews = pgTable("workout_previews", {
  token: uuid("token").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // "create" | "schedule" — qué confirma este token
  payload: jsonb("payload").notNull(), // DSL + JSON ya traducido + (si es schedule) el garminWorkoutId y la fecha
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// mcp_audit_log: toda invocación de tool, lectura o escritura
export const mcpAuditLog = pgTable("mcp_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tool: text("tool").notNull(),
  argsRedacted: jsonb("args_redacted").notNull(), // nunca el PairWorkout completo si trae notas libres del usuario sin filtrar — ver nota de redacción abajo
  isError: boolean("is_error").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

`workout_previews` con TTL corto (propuesta: 15 min, igual orden de magnitud que un token OAuth de corta vida) y una query de limpieza perezosa (borrar expirados en el mismo insert, no un cron aparte — volumen bajo, no hace falta más).

**Redacción en `mcp_audit_log`**: el `notes` libre de un `PairWorkout` es texto que el entrenador escribió tal cual (`workout-dsl.md`) — no es secreto, pero tampoco aporta nada auditar su contenido completo. Se guarda la forma (deporte, cantidad de steps, si tiene `repeat`) sin el texto libre ni los targets numéricos exactos. Detalle final de qué campos quedan se resuelve en plan mode, no es una decisión de diseño grande.

### Flujo preview → confirm

1. `workout_preview({ workout: PairWorkout })`: valida con `dsl.ts`, traduce con `translate.ts`. Si falla cualquiera de los dos, `isError` con el mensaje explícito (nunca un JSON de Zod crudo — traducido a algo que Claude pueda explicarle al usuario). Si pasa, inserta en `workout_previews` (`kind: "create"`) y devuelve el resumen legible (formato ya diseñado en `workout-dsl.md`, ej. "5x1000 - martes · Carrera · ~48 min / ~10.5 km...") + el `token`.
2. `workout_create({ token })`: busca el token, verifica que no expiró y que es `kind: "create"` y del mismo `userId` de la sesión. `POST` a Garmin vía `packages/core` (rate limiter incluido). Guarda en `workouts`. Borra el token (de un solo uso).
3. `workout_schedule({ garminWorkoutId o token de create reciente, date })`: análogo — primero valida/arma el payload de agendado y devuelve un segundo preview (`kind: "schedule"`, resumen tipo "agendar '5x1000 - martes' para el 2026-09-20"), luego confirma. Dos pasos también para agendar, no solo para crear: agendar es una escritura a Garmin igual que crear (regla dura 4 del `CLAUDE.md` raíz no distingue "crear" de "agendar").

### `list_workouts`

Scope `workouts:read`. Lee de `workouts` (lo creado desde PAIR) — no hay "listar todos los workouts de la cuenta de Garmin", porque Garmin no expone ese catálogo por API confirmada todavía y no es el caso de uso (Claude necesita ver lo que *él* creó, no el historial completo de Garmin Connect). Mismo patrón de salida resumida que `list_activities`.

### Audit log: dónde se escribe

Un wrapper único (`apps/mcp/src/tools/with-audit-log.ts` o análogo) envuelve cada `registerTool`, en vez de que cada archivo de tool llame al insert a mano — mismo espíritu que `require-scope.ts`, plomería compartida, no once copias. Se decide el nombre/forma exacta en plan mode.

## Checklist de implementación

- [ ] `/garmin-endpoint`: confirmar `stepTypeId` de `cooldown`/`rest` contra un workout real
- [ ] `packages/db/src/schema/workouts.ts`, `workout-previews.ts`, `mcp-audit-log.ts` + migración
- [ ] `packages/db/src/repositories/workouts.ts`, `workout-previews.ts`, `mcp-audit-log.ts`
- [ ] `packages/core/src/workout/dsl.ts` (cobertura v1, ver tabla arriba)
- [ ] `packages/core/src/workout/translate.ts` + fixture + test (regla de `packages/core/CLAUDE.md`: toda función de traducción con test de fixture real anonimizado)
- [ ] `apps/mcp/src/tools/with-audit-log.ts` (o el nombre que se decida) + retrofit a las tools de lectura ya existentes
- [ ] `apps/mcp/src/tools/list-workouts.ts`, `workout-preview.ts`, `workout-create.ts`, `workout-schedule.ts`
- [ ] Registrar las 4 en `apps/mcp/src/mcp-session.ts`, actualizar tabla de `apps/mcp/CLAUDE.md` (ya tiene las 5 tools de escritura/lectura de workouts prefiguradas, y `workouts:read`/`workouts:write` ya existen en `packages/core/src/oauth-scopes.ts` — ambos solo documentación/constante hasta este cambio)
- [ ] Probado de punta a punta contra cuenta real: crear un workout simple (calentamiento + series + pace) y verificar que aparece en la app de Garmin; agendarlo y confirmar el equivalente a `messageStatus: "new"` (ya visto en P0)
- [ ] Probado con Claude Desktop real: foto de un entrenamiento → preview → confirmación → creado

## Preguntas abiertas

- Forma final de los campos redactados en `mcp_audit_log` — no bloquea, se resuelve en plan mode.
- Si `workout_schedule` debe poder recibir directamente un `garminWorkoutId` (para agendar algo creado en otra sesión de chat) o solo encadenarse al `token` que devolvió `workout_create` en la misma conversación — afecta el caso de uso de `training-plan.md` (aprobar una sesión de un plan creado hace días). Probablemente necesita aceptar `garminWorkoutId`, se confirma en plan mode de ese spec.
