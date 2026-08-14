# Roadmap

Regla: no se empieza una fase sin cumplir el criterio de salida de la anterior. El orden está elegido para que el riesgo se descubra temprano, no para que se vea bonito antes.

---

## P0 — Spike de autenticación ⬅ fase actual

Objetivo: demostrar que podemos autenticar, leer y **escribir** en Garmin. Si esto falla, el proyecto cambia de forma.

- [ ] Script Python con `garminconnect`/`garth`: login con MFA contra una cuenta real.
- [ ] Persistir y recargar los tokens; confirmar que un proceso nuevo funciona sin re-login.
- [ ] Provocar y observar la expiración del OAuth2; confirmar que el refresh funciona.
- [ ] Listar actividades. Guardar un payload real como fixture anonimizado.
- [ ] `GET` de un workout existente creado a mano en Garmin Connect. **Este dump es la fuente de verdad de todas las constantes numéricas.**
- [ ] Crear un workout vía `POST` y verificar que aparece en la app de Garmin.
- [ ] Agendar ese workout en una fecha y **verificar que llega al reloj tras sincronizar**.
- [ ] Documentar todo en `garmin-api.md` con estado `confirmado`.

**Salida**: un workout creado desde código aparece en el reloj. Todas las constantes de `workout-dsl.md` confirmadas.

**Riesgos**: Garmin puede haber cambiado el SSO; la creación de workouts puede requerir campos no documentados; el push al dispositivo puede depender del sync y no ser inmediato.

---

## P1 — Gateway y datos

- [ ] Monorepo pnpm + Turborepo, tooling compartido.
- [ ] `services/garmin-auth` reducido a `POST /login`, `POST /mfa`, `POST /refresh`.
- [ ] `packages/core`: cliente REST TS con Bearer, refresh transparente, rate limiter, errores tipados.
- [ ] `packages/db`: schema Drizzle + migraciones.
- [ ] Cifrado de tokens en reposo con clave por usuario.
- [ ] Sync incremental con BullMQ: actividades y métricas diarias.
- [ ] Fixtures y tests del parser sin red.

**Salida**: `pnpm sync --user X` llena la DB desde cero y en incremental sin superar el rate limit.

---

## P2 — Web app

- [ ] Auth propia de PAIR (email + magic link, o passkeys).
- [ ] Onboarding: conectar Garmin con MFA desde la UI.
- [ ] Dashboard v1: lista de actividades, detalle, métricas diarias.
- [ ] Estado de sincronización visible y reconexión cuando las credenciales expiran.

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

## P4 — Dashboard personalizable

- [ ] Widgets configurables y layout persistente.
- [ ] Métricas derivadas propias (carga, ratio agudo/crónico, adherencia al plan).
- [ ] Comparación plan vs. ejecutado, que es lo que Garmin Connect hace mal.

**Salida**: el dashboard responde una pregunta que la app de Garmin no responde.

---

## Fuera de alcance por ahora

Producto público, planes de pago, app móvil, integraciones con Strava/TrainingPeaks, entrenamientos de fuerza con ejercicios detallados (el catálogo de ejercicios de Garmin es un proyecto en sí mismo).
