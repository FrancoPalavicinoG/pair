# Roadmap

Regla: no se empieza una fase sin cumplir el criterio de salida de la anterior. El orden está elegido para que el riesgo se descubra temprano, no para que se vea bonito antes.

**Reordenamiento (2026-08-24)**: P4 pasa antes que P3. Con P2 cerrado, el dashboard solo refleja lo que Garmin Connect ya muestra — no hay ningún aporte propio todavía. Se prioriza construir eso (P4: widgets, métricas derivadas, comparación plan vs. ejecutado) antes de invertir en MCP/conectores (P3), que no le suma nada a la app si el dashboard de abajo no tiene valor propio. `docs/specs/mcp-oauth-server.md` queda escrito (investigación real ya hecha) pero pausado, no descartado.

**Reordenamiento (2026-09-02)**: P3 se retoma y pasa a ser la fase activa — `docs/specs/mcp-oauth-server.md` deja de estar pausado. La visión del proyecto se precisó en esta sesión (ver `CLAUDE.md`): sin P3 no existe el harness Garmin↔Claude, que es la razón de ser central del proyecto. En paralelo, P5 se adelanta: el "dog factor" y el historial de ejercicio no dependen de que el MCP exista (son storage + UI propia) y además son la data que las tools de P3 van a exponer, así que conviene construirlos a la vez, no en secuencia. Se agregan P6 (vista de plan) y P7 (ajuste automático diario) como fases nuevas, explícitamente **fuera de esta iteración** — quedan documentadas para no perder las decisiones ya tomadas (sobre todo la de P7: cron server-side, ver más abajo) sin comprometernos a construirlas ahora. El último ítem de P4 (comparación plan vs. ejecutado) pasa a depender de P3: sin un plan real no hay contra qué comparar lo ejecutado.

**Reordenamiento (2026-09-13)**: con P3 (lectura + insight) mergeado y el diseño de capas de P5/P6 ya confirmado contra Garmin real (`3200c5f`, 2026-09-10), el usuario pide adelantar **P6** (antes explícitamente fuera de esta iteración) para progresar en una sola sesión el flujo completo: plan multi-sesión conversacional → zonas reales → workout agendado en Garmin. El modelo de datos y las tools de MCP de P6 pasan a construirse ahora, en paralelo con lo que falta de P3 (DSL + tools de escritura) y P5 (zonas/perfil) — los tres specs están escritos y se revisan juntos antes de plan mode: `docs/specs/garmin-user-profile.md` (P5, ya draft), `docs/specs/mcp-workout-tools.md` (P3, nuevo) y `docs/specs/training-plan.md` (P6, nuevo, acotado a modelo + tools — la vista en la web y la edición reflejada a Garmin siguen fuera, su propio spec cuando corresponda). P7 sigue explícitamente fuera.

---

## P0 — Spike de autenticación

Objetivo: demostrar que podemos autenticar, leer y **escribir** en Garmin. Si esto falla, el proyecto cambia de forma.

- [x] Script Python con `garth`: login contra una cuenta real (`spike/login.py`, fuera del monorepo). MFA sin probar: la cuenta de prueba no lo tiene activo.
- [x] Persistir y recargar los tokens; confirmar que un proceso nuevo funciona sin re-login.
- [x] Provocar y observar la expiración del OAuth2; confirmar que el refresh funciona.
- [x] Listar actividades. Guardar un payload real como fixture anonimizado (`docs/fixtures/activities-list.anon.json`).
- [x] `GET` de un workout existente creado a mano en Garmin Connect. **Fuente de verdad de las constantes numéricas** (parcial: warmup/interval/recovery/repeat/pace confirmados; cooldown/rest/hr/power/cadence quedan para cuando el DSL los necesite).
- [x] Crear un workout vía `POST` y verificar que aparece en la app de Garmin.
- [x] Agendar ese workout en una fecha y confirmar el equivalente API del push al reloj (`messageStatus: "new"`). La entrega física al reloj depende del sync BLE/WiFi del teléfono, fuera del control de la API — verificación visual en el reloj queda como paso manual opcional, no bloqueante.
- [x] Documentar todo en `garmin-api.md` con estado `confirmado` (proceso continuo, cada hallazgo en su propio cambio).

**Salida**: un workout creado desde código aparece en la cuenta y queda encolado para el reloj (confirmado a nivel API). Las constantes de `workout-dsl.md` necesarias para un workout simple de running (tiempo, distancia, pace) están confirmadas; el resto se confirma incrementalmente en P1 a medida que el DSL las necesite, no de una.

**Riesgos**: Garmin puede haber cambiado el SSO; la creación de workouts puede requerir campos no documentados; el push al dispositivo puede depender del sync y no ser inmediato.

---

## P1 — Gateway y datos (MVP)

Objetivo: el gateway funcionando de punta a punta con la infraestructura mínima. Nada de colas, cache ni suites de test todavía — eso se agrega cuando el volumen real lo pida, no antes (ver "Escala objetivo" en `CLAUDE.md`).

- [x] Monorepo: pnpm workspaces + `packages/config` (tsconfig/eslint/prettier compartido). Sin Turborepo por ahora: scripts de npm normales en el `package.json` raíz.
- [x] `packages/db`: schema mínimo (`users`, `garmin_credentials`, `activities`, `daily_metrics`) + migraciones. Postgres local con docker-compose. Sin Redis (no hace falta sin BullMQ).
- [x] Cifrado de tokens en reposo con clave por usuario — no negociable aunque el resto sea mínimo. AES-256-GCM (`node:crypto`), no libsodium (bug de empaquetado con ESM, ver `docs/architecture.md`).
- [x] `services/garmin-auth` reducido a `POST /login`, `POST /mfa`, `POST /refresh`, con el workaround de `garth` confirmado en P0 (0.6.3 + User-Agent de navegador).
- [x] `packages/core`: cliente REST TS con Bearer, refresh transparente, rate limiter simple en memoria (sin colas), errores tipados.
- [x] Script de sync incremental, TS plano sin BullMQ: actividades y métricas diarias por fecha.

**Salida, confirmada (2026-08-15) contra cuenta real**: `pnpm sync --user X` corrido dos veces. Primera vez (DB vacía para ese usuario): 500 actividades + 31 días de métricas, ~57 pedidos a Garmin, 47.6s, sin ningún 429. Segunda vez, inmediatamente después: 0 actividades nuevas, 1 día (hoy, que siempre se re-sincroniza), 2.9s — 16x más rápido, prueba directa de que el incremental evita el refetch completo. P1 cerrada.

**Diferido, no ahora**: BullMQ + Redis (colas reales), Turborepo (cache/orquestación), suite de tests con fixtures. Se agregan cuando el volumen o la necesidad de reproducibilidad lo pidan — no antes.

---

## P2 — Web app

- [x] Auth propia de PAIR: email + password (simple para MVP, sin dependencia de un proveedor de email; magic link/passkeys quedan para después si hace falta). Spec: `docs/specs/app-auth.md`.
- [x] Onboarding: conectar Garmin con MFA desde la UI. Spec: `docs/specs/app-garmin-connect.md`.
- [x] Dashboard v1: lista de actividades, detalle, métricas diarias. Spec: `docs/specs/app-dashboard-v1.md`.
- [x] Estado de sincronización visible y reconexión cuando las credenciales expiran. Spec: `docs/specs/app-sync-status.md`.

**Salida**: un amigo se registra solo, conecta su Garmin y ve sus datos sin ayuda.

---

## P3 — MCP y conectores ⬅ fase actual

- [x] Gate de conexión Garmin + hub "Connections": sacar `Connect Garmin` del nav fijo del sidebar. La conexión con Garmin pasa a ser un gate, no una vista navegable — mismo patrón que `requireSession()` → `/login`: si no hay credenciales o el token expiró, se redirige directo a la vista de login de Garmin antes de renderizar cualquier ruta de `(app)`; conectado, no se vuelve a ver. El tab `Connections` del sidebar queda para el conector MCP (placeholder hasta que exista). Spec: `docs/specs/app-connections.md`.
- [x] Authorization Server OAuth 2.1 con DCR + PKCE, a mano (sin librería — ver `docs/specs/mcp-oauth-server.md`; los helpers de auth del SDK de MCP están deprecados/congelados y son Express, no Hono).
- [x] `apps/mcp` sobre Streamable HTTP, sesión → usuario. Primera tool: `get_started`. Ver `docs/specs/mcp-transport.md`.
- [x] Tools de lectura: actividades y métricas diarias (`list_activities`, `get_activity`, `get_daily_metrics`). Ver `docs/specs/mcp-read-tools.md`.
- [x] Tools de "insight" que traducen los datos crudos (carga, HRV, readiness) en algo que Claude pueda razonar — `get_training_load` y `get_recovery_trend`. Ver `docs/specs/mcp-insight-tools.md`. Dog factor queda afuera (P5 no arrancó todavía).
- [ ] DSL `PairWorkout` + traductor + tests. Spec: `docs/specs/mcp-workout-tools.md`.
- [ ] Tools de escritura con preview → confirm: crear/agendar workouts. Mismo spec. **Registrar sets de ejercicio** (peso, reps) queda fuera de ese spec — depende del historial de P5, que todavía no tiene spec propio.
- [ ] Vista `/settings/connectors` (dentro de `Connections`): URL de conexión, instrucciones por cliente, sesiones activas, revocación.
- [ ] Pantalla de consentimiento con scopes legibles.
- [ ] `audit_log` de toda escritura. Spec: `docs/specs/mcp-workout-tools.md` (se agrega junto con las tools de escritura, y de paso cubre retroactivamente las tools de lectura ya mergeadas).

**Salida**: foto de un entrenamiento en Claude Desktop → confirmación → workout en el reloj.

---

## P4 — Dashboard personalizable

- [x] Widgets configurables y layout persistente. Spec: `docs/specs/app-dashboard-widgets.md`.
- [x] Librería de componentes de UI propios. Spec: `docs/specs/ui-component-library.md`.
- [x] Catálogo de datos diarios de Garmin (bienestar, entreno, reportes históricos). Spec: `docs/specs/garmin-daily-metrics.md`.
- [x] Sistema de visualización v2 (gauges, fases de sueño, zonas de potencia). Spec: `docs/specs/dashboard-visualization-system.md`.
- [x] Dashboard widgets v2 (Activities al sidebar, tiles individuales, grilla cuadrada). Spec: `docs/specs/app-dashboard-widgets-v2.md`.
- [ ] Comparación plan vs. ejecutado, que es lo que Garmin Connect hace mal. Depende de que exista un plan real (DSL de P3): sin eso no hay contra qué comparar lo ejecutado.

**Sacado del roadmap (2026-08-31)**: "Métricas derivadas propias (carga, ratio agudo/crónico)" — Garmin ya calcula y expone ese número (`garmin-daily-metrics.md`, ACWR confirmado real), así que no hace falta derivarlo nosotros. Se resuelve trayendo el dato como widget más en `app-dashboard-widgets-v2` Fase B, no como ítem de roadmap aparte.

**Salida**: el dashboard responde una pregunta que la app de Garmin no responde.

---

## P5 — Perfil de usuario y señales diarias

Corre en paralelo a P3: es storage + UI propia, no depende de que el MCP exista, y las tools de "insight" de P3 leen de acá.

- [ ] Datos físicos básicos (altura, peso): sync desde Garmin cuando esté disponible, edición manual como fallback.
- [ ] Zonas de esfuerzo por deporte: ritmo de carrera, FTP de ciclismo — sync desde Garmin cuando esté disponible, manual si no. **Confirmado contra Garmin real (2026-09-10, `docs/garmin-api.md`)**: zonas de FC por deporte y FTP de ciclismo se sincronizan tal cual, Garmin ya los calcula — no hace falta una fórmula propia. La velocidad de umbral de running existe pero su unidad no está confirmada, queda pendiente de verificar antes de usarla. Diseño completo (cómo se guardan, cómo las resuelve la tool sin romper la pureza del traductor) en `docs/architecture.md`, "Flujo: plan de entrenamiento conversacional".
- [ ] Historial de ejercicio de fuerza: un registro por fecha y ejercicio (peso, reps), no un número suelto. No depende del catálogo de ejercicios de Garmin — eso sigue fuera de alcance. El máximo vigente se deriva del historial con su fecha; un máximo de hace 6+ meses no cuenta como vigente (umbral exacto a definir en el spec).
- [ ] "Dog factor": input diario manual (escala 1-10) que el usuario reporta en PAIR. Actúa como override en las decisiones de ajuste de plan (P7): un dog factor alto sostiene la carga aunque las métricas de Garmin digan lo contrario; uno bajo la baja aunque las métricas estén bien. Seguimiento de qué lo explica (journaling) queda para una iteración futura.

**Salida**: el traductor DSL de P3 puede resolver targets relativos ("85% de tu máximo", "zona 3 de ritmo") a valores absolutos sin pedirle el número al usuario en cada workout, y las tools de insight de P3 tienen el dog factor disponible como señal.

---

## P6 — Vista de plan de entrenamiento

**Adelantado (2026-09-13)**: el modelo de datos y las tools de MCP se adelantan, en paralelo con lo que falta de P3/P5 — ver nota de reordenamiento arriba y `docs/specs/training-plan.md`. La vista en la web y la edición manual reflejada a Garmin siguen fuera de esta iteración: dependen de tener el modelo+tools funcionando primero, y son su propio spec (drill-down de superficie visual, no se diseña junto con el modelo — `feedback_spec_phasing`).

Objetivo: el plan que arma Claude vía el DSL de P3 se ve y se edita en PAIR, no solo en el chat. Depende de que P3 tenga el DSL y las tools de escritura funcionando — sin eso no hay plan que mostrar.

**Alcance ampliado (2026-09-10)**: el caso de uso ya no es solo "un workout suelto que se ve en la web" — es que Claude arme un plan completo conversacionalmente (ej. "método noruego para tal carrera", ajustado con la carga real del usuario, revisable con feedback tipo "no me gustó cómo encaraste esto"), y ese plan tiene que sobrevivir entre conversaciones distintas, no solo vivir en la memoria del chat activo. Diseño de las tablas (`training_plans`/`planned_sessions`) y de cuándo se resuelven los targets por zona en `docs/architecture.md`, "Flujo: plan de entrenamiento conversacional".

- [ ] Modelo de datos del plan (agenda de sesiones, no solo el workout suelto que P3 ya agenda en Garmin) — spec: `docs/specs/training-plan.md`
- [ ] Tools de MCP para que Claude proponga/edite sesiones de un plan (borrador en la DB de PAIR, sin gate de preview→confirm hasta que la sesión puntual se agenda de verdad en Garmin) — mismo spec
- [ ] Vista de plan en la web: calendario/lista de sesiones, detalle por sesión — **fuera de esta iteración**, spec propio cuando corresponda
- [ ] Edición manual desde la web, reflejada de vuelta en Garmin (mismo patrón preview → confirm que las escrituras vía MCP) — **fuera de esta iteración**, depende del ítem anterior

**Salida**: el plan que Claude arma se puede ver y ajustar sin volver al chat.

---

## P7 — Ajuste automático diario

No entra en esta iteración. Depende de P3 (tools + DSL), P5 (dog factor, historial de ejercicio) y P6 (que exista un plan real que ajustar). Queda documentada la decisión de mecanismo, tomada en esta sesión, para no tener que redescutirla cuando llegue el turno.

Objetivo: todas las mañanas, PAIR ajusta el plan del usuario según sus métricas de Garmin, su historial reciente de actividades y su dog factor, sin que el usuario tenga que pedirlo en el chat. Ejemplo: el plan tiene series de running programadas, pero ayer hubo CrossFit que cargó piernas — Claude decide bajar la carga o cambiar la sesión, no PAIR con una regla fija.

- [ ] Decisión de arquitectura: cron server-side en PAIR que llama directo a la API de Claude (no espera a que el usuario abra Claude Desktop/Code), con las tools de P3 disponibles en proceso. Esto es un componente nuevo: PAIR pasa a operar un agente, no solo a exponer un MCP para clientes externos — se documenta en `docs/architecture.md` cuando este ítem se especifique.
- [ ] Spec pendiente: cómo se acota el gasto de API por usuario/día, qué pasa si el ajuste falla o no hay nada que ajustar, cómo se notifica al usuario del cambio.

**Salida**: el plan se ajusta solo cada mañana según métricas + dog factor, sin que el usuario tenga que pedirlo.

---

## Fuera de alcance por ahora

Producto público, planes de pago, app móvil, integraciones con Strava/TrainingPeaks, entrenamientos de fuerza con ejercicios detallados (el catálogo de ejercicios de Garmin es un proyecto en sí mismo).
