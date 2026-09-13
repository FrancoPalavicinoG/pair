# Spec: Plan de entrenamiento conversacional (`training_plans`/`planned_sessions` + tools de MCP)

Roadmap: P6 (Vista de plan de entrenamiento), ítems "Modelo de datos del plan" y "Tools de MCP para que Claude proponga/edite sesiones de un plan". **Adelantado fuera de orden esta sesión (2026-09-13)** — ver nota de reordenamiento en `docs/roadmap.md`. Depende de `mcp-workout-tools.md` (P3) para el paso de aprobar una sesión contra Garmin, y de `garmin-user-profile.md` (P5) para resolver targets por zona.
Estado: draft

## Objetivo

Que Claude pueda armar un plan de entrenamiento multi-sesión conversacionalmente (ej. "método noruego para la maratón del 15 de noviembre"), que **persiste entre conversaciones distintas** (no solo en la memoria del chat activo), se ajusta con feedback del usuario ("no me gustó cómo encaraste esta semana"), y cuyas sesiones aprobadas terminan agendadas de verdad en Garmin.

Salida observable: Claude crea un `training_plan` con varias `planned_sessions` en estado `draft`; en una conversación distinta, días después, Claude puede recuperar ese mismo plan y seguir editándolo; al aprobar una sesión, pasa por el gate real de `workout_preview`/`workout_create`/`workout_schedule` y queda `approved` con su `garmin_workout_id`.

## Alcance

**Entra**: modelo de datos (`training_plans`, `planned_sessions`), repositorios CSR, y las tools de MCP para crear el plan, listarlo/recuperarlo, y proponer/editar/aprobar sesiones.

**No entra** (diferido, spec aparte cuando corresponda — mismo criterio de `feedback_spec_phasing`: esto es el modelo y las tools, no la superficie visual):
- **Vista de plan en la web** (ítem propio de P6 en el roadmap): calendario/lista de sesiones, detalle por sesión. Nada de esto se construye acá.
- **Edición manual desde la web reflejada en Garmin**: depende de que la vista exista primero.
- **P7 (ajuste automático diario)**: totalmente fuera. Se deja un campo (`linked_activity_id` en `planned_sessions`) ya prefigurado para no migrar dos veces, pero ninguna lógica de ajuste se construye acá.
- **Resolución automática de "en qué día cae cada sesión"** contra `availableTrainingDays`/`preferredLongTrainingDays` de P5: Claude puede leerlos vía `get_user_profile` y decidir con eso, pero no hay una función propia de scheduling — es razonamiento de Claude, no código nuestro.
- **Borrado de un plan completo**: sin caso de uso todavía (¿qué pasa con sesiones ya `approved` en Garmin? ameritaría su propio preview→confirm de cancelación en cadena). Se agrega cuando haga falta.

## Diseño

### Las tres capas (ya acordado en `docs/architecture.md`, "Flujo: plan de entrenamiento conversacional")

```
TrainingPlan (este spec)   — objetivo, fecha, metodología en texto libre, muchas sesiones
     │  contiene muchos...
PairWorkout (mcp-workout-tools.md) — un entrenamiento puntual, targets absolutos o por zona
     │  sus targets por zona se resuelven contra...
sport_zones (garmin-user-profile.md) — FC/FTP por deporte, sync desde Garmin
```

### Schema (`packages/db`)

```ts
export const trainingPlans = pgTable("training_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goal: text("goal").notNull(), // "Maratón de Santiago, sub 3:30" — texto libre, contexto para Claude, no una constante nuestra
  targetDate: date("target_date"),
  methodology: text("methodology"), // "método noruego" — idem, texto libre
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const planSessionStatus = pgEnum("plan_session_status", ["draft", "approved", "completed"]);

export const plannedSessions = pgTable("planned_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull().references(() => trainingPlans.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // denormalizado a propósito: toda query filtra por user_id sin un join a training_plans (regla dura de packages/db/CLAUDE.md)
  pairWorkout: jsonb("pair_workout").notNull(), // puede tener targets por zona SIN resolver (hrZone, no el bpm absoluto) mientras está en draft
  scheduledDate: date("scheduled_date"),
  status: planSessionStatus("status").default("draft").notNull(),
  garminWorkoutId: text("garmin_workout_id"), // solo una vez approved
  linkedActivityId: uuid("linked_activity_id").references(() => activities.id), // P7, sin uso todavía
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

`pairWorkout` guarda el DSL tal cual, zonas sin resolver incluidas — la resolución pasa recién al aprobar (ver abajo), nunca al guardar el draft: las zonas cambian con el tiempo (un FTP nuevo), y resolver antes dejaría sesiones futuras del plan con números viejos. Esto es la misma decisión ya tomada en `docs/workout-dsl.md`.

### Scope nuevo: `plans:read`/`plans:write`

Igual criterio que `profile:read` en `garmin-user-profile.md`: un plan es dato propio de PAIR, no de Garmin — separar el scope permite autorizar "que Claude vea/edite mi plan" sin necesariamente autorizar lectura de actividades o escritura de workouts sueltos, y viceversa. Se agrega a `PAIR_OAUTH_SCOPES` + `SCOPE_LABELS`.

### Tools de MCP

| Tool | Scope | Efecto |
|---|---|---|
| `plan_create` | `plans:write` | Crea un `training_plan` (objetivo, fecha, metodología). Sin sesiones todavía |
| `list_plans` | `plans:read` | Planes del usuario, resumido (objetivo, fecha, cantidad de sesiones por estado) — para que Claude recupere el plan en una conversación distinta |
| `get_plan` | `plans:read` | Un plan con el detalle de sus sesiones (estado, fecha, resumen del `PairWorkout` en el mismo formato legible de `workout_preview`) |
| `plan_add_session` | `plans:write` | Agrega una `planned_session` en `draft` a un plan existente. Sin preview→confirm: es escritura a la DB de PAIR, no a Garmin (regla dura 4 del `CLAUDE.md` raíz aplica solo a escrituras a Garmin) |
| `plan_update_session` | `plans:write` | Edita una sesión en `draft` (Claude ajusta por feedback del usuario). Una sesión `approved`/`completed` no se edita por esta vía — error explícito si se intenta |
| `plan_approve_session` | `plans:write` + efectivamente `workouts:write` | Resuelve targets por zona sin resolver contra `sport_zones` (si los tiene), y entrega el `PairWorkout` resuelto al mismo flujo de `workout_preview`. Ver "Dónde se resuelve la zona" abajo |

**Sin `plan_delete_session` ni `plan_delete`** en este spec — mismo motivo que `workout_delete` en `mcp-workout-tools.md`, sin caso de uso todavía.

### Dónde se resuelve la zona, y cómo se conecta con `workout_preview`

`packages/core` sigue sin tocar la DB (`packages/core/CLAUDE.md`). La resolución ("zona 3 de FC" → "150-159 bpm") pasa en la capa de tool, específicamente en `plan_approve_session`: lee `sport_zones` del usuario vía `packages/db`, arma un `PairWorkout` con targets ya absolutos, y a partir de ahí el flujo es **exactamente** el de `mcp-workout-tools.md` — `plan_approve_session` no crea el workout ella misma, devuelve el mismo resumen + `preview_token` que devolvería `workout_preview`, y Claude confirma con `workout_create`/`workout_schedule` como si fuera un workout suelto. Así el gate de seguridad (preview→confirm hacia Garmin) vive en un solo lugar, no se duplica entre "workout suelto" y "sesión de un plan". Al confirmarse, la `planned_session` correspondiente pasa a `approved` con el `garmin_workout_id` resultante (requiere que `workout_create`/`workout_schedule` acepten un `planned_session_id` opcional para saber qué fila actualizar — detalle de firma, se resuelve en plan mode).

### Formato de salida hacia Claude

Mismo criterio que el resto de `apps/mcp/CLAUDE.md`: texto legible, sin IDs internos inútiles, resumido. `get_plan` muestra cada sesión con el mismo formato de preview de `workout-dsl.md` ("5x1000 - martes · Carrera · ~48 min / ~10.5 km...") más su fecha y estado — no un volcado del DSL completo salvo que Claude lo necesite para editar (en cuyo caso sí se devuelve el JSON, es lo que Claude va a mandar de vuelta en `plan_update_session`).

## Checklist de implementación

- [ ] `packages/db/src/schema/training-plans.ts`, `planned-sessions.ts` + migración
- [ ] `packages/db/src/repositories/training-plans.ts`, `planned-sessions.ts`
- [ ] `packages/core/src/oauth-scopes.ts`: agregar `plans:read`/`plans:write`
- [ ] `apps/web/src/services/oauth-service.ts`: labels de los scopes nuevos
- [ ] `apps/mcp/src/tools/plan-create.ts`, `list-plans.ts`, `get-plan.ts`, `plan-add-session.ts`, `plan-update-session.ts`, `plan-approve-session.ts`
- [ ] Decidir y documentar la firma exacta del puente `plan_approve_session` → `workout_preview`/`workout_create`/`workout_schedule` (cómo viaja el `planned_session_id`)
- [ ] Registrar las 6 tools en `apps/mcp/src/mcp-session.ts`, actualizar tabla de `apps/mcp/CLAUDE.md`
- [ ] Probado con Claude Desktop real: crear un plan de varias semanas, cerrar la conversación, abrir una nueva, recuperarlo con `list_plans`/`get_plan`, editar una sesión por feedback, aprobar una y verificar que aparece agendada en Garmin

## Preguntas abiertas

- Si `plan_update_session`/`plan_add_session` deberían tener su propio límite de sesiones por plan (evitar que Claude genere, por error, un plan de 200 sesiones de una llamada) — no bloquea, se define un límite razonable en plan mode.
- Qué pasa con una `planned_session` cuyo `scheduledDate` ya pasó y nunca se aprobó (¿se marca algo, o queda `draft` indefinidamente?) — sin decisión todavía, no bloquea el v1.
