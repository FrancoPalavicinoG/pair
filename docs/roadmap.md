# Roadmap

Regla: no se empieza una fase sin cumplir el criterio de salida de la anterior. El orden está elegido para que el riesgo se descubra temprano, no para que se vea bonito antes.

**Reordenamiento (2026-08-24)**: P4 pasa antes que P3. Con P2 cerrado, el dashboard solo refleja lo que Garmin Connect ya muestra — no hay ningún aporte propio todavía. Se prioriza construir eso (P4: widgets, métricas derivadas, comparación plan vs. ejecutado) antes de invertir en MCP/conectores (P3), que no le suma nada a la app si el dashboard de abajo no tiene valor propio. `docs/specs/mcp-oauth-server.md` queda escrito (investigación real ya hecha) pero pausado, no descartado.

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

## P3 — MCP y conectores

- [ ] Authorization Server OAuth 2.1 con DCR + PKCE (vía librería, ver ADR 0003).
- [ ] `apps/mcp` sobre Streamable HTTP, sesión → usuario.
- [ ] Tools de lectura.
- [ ] DSL `PairWorkout` + traductor + tests.
- [ ] Tools de escritura con preview → confirm.
- [ ] Vista `/settings/connectors`: URL de conexión, instrucciones por cliente, sesiones activas, revocación.
- [ ] Pantalla de consentimiento con scopes legibles.
- [ ] `audit_log` de toda escritura.

**Salida**: foto de un entrenamiento en Claude Desktop → confirmación → workout en el reloj.

---

## P4 — Dashboard personalizable ⬅ fase actual

- [x] Widgets configurables y layout persistente. Spec: `docs/specs/app-dashboard-widgets.md`.
- [ ] Librería de componentes de UI propios. Spec: `docs/specs/ui-component-library.md`.
- [ ] Catálogo de datos diarios de Garmin (bienestar, entreno, reportes históricos). Spec: `docs/specs/garmin-daily-metrics.md`.
- [ ] Sistema de visualización v2 (gauges, fases de sueño, zonas de potencia). Spec: `docs/specs/dashboard-visualization-system.md`.
- [ ] Dashboard widgets v2 (Activities al sidebar, tiles individuales, grilla cuadrada). Spec: `docs/specs/app-dashboard-widgets-v2.md`.
- [ ] Métricas derivadas propias (carga, ratio agudo/crónico, adherencia al plan).
- [ ] Comparación plan vs. ejecutado, que es lo que Garmin Connect hace mal.

**Salida**: el dashboard responde una pregunta que la app de Garmin no responde.

---

## P5 — Perfil de usuario

- [ ] Datos físicos básicos (altura, peso): sync desde Garmin cuando esté disponible, edición manual como fallback.
- [ ] Zonas de esfuerzo por deporte: ritmo de carrera, FTP de ciclismo — sync desde Garmin cuando esté disponible, manual si no.
- [ ] 1RM por ejercicio de fuerza, carga manual (números sueltos, no depende del catálogo de ejercicios de Garmin — eso sigue fuera de alcance).

**Salida**: el traductor DSL de P3 puede resolver targets relativos ("85% de tu máximo", "zona 3 de ritmo") a valores absolutos sin pedirle el número al usuario en cada workout.

---

## Fuera de alcance por ahora

Producto público, planes de pago, app móvil, integraciones con Strava/TrainingPeaks, entrenamientos de fuerza con ejercicios detallados (el catálogo de ejercicios de Garmin es un proyecto en sí mismo).
