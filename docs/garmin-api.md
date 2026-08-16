# API no oficial de Garmin Connect — memoria del proyecto

> **Este archivo es la memoria del proyecto.** Todo lo que descubramos sobre la API se escribe aquí en el mismo cambio que lo descubre. No hay documentación oficial: esto es lo que hay.
>
> Cada entrada lleva estado:
> - `confirmado` — verificado contra la cuenta real, con fecha.
> - `por confirmar` — derivado de leer `python-garminconnect` / `garth`, sin verificar.
> - `roto` — funcionaba y dejó de funcionar. Deja la entrada, no la borres: el histórico de roturas es información.

## Fuentes

- `cyberjunky/python-garminconnect` — wrapper de endpoints.
- `matin/garth` — el que realmente resuelve el SSO y los tokens. Es la dependencia crítica.
- Issues de ambos repos: primer sitio a mirar cuando algo se rompe de un día para otro.

---

## Autenticación

Estado: **confirmado** (2026-08-14), con workaround. Login real contra cuenta propia exitoso con `garth==0.6.3` + UA de navegador. Ver detalle en "Roturas y cambios". La cuenta probada no tiene MFA activo, así que el paso 3 (código MFA) sigue **por confirmar**.

El flujo, a alto nivel:

1. Formulario SSO en `sso.garmin.com`, con parámetros de servicio y un token CSRF que hay que extraer del HTML.
2. POST de credenciales manteniendo cookies → devuelve un **ticket**.
3. Si la cuenta tiene MFA: paso intermedio con el código, conservando el estado de la sesión.
4. Ticket → **token OAuth1**, firmado con un consumer key/secret que Garmin no publica y que `garth` obtiene de un recurso público.
5. OAuth1 → **token OAuth2 (Bearer)**, que es el que usan todas las llamadas de datos.

Persistencia y reload: **confirmado (2026-08-14)**. `garth.save(dir)` + `garth.resume(dir)` en un proceso nuevo recarga la sesión sin pedir login de nuevo.

Vidas útiles: el OAuth1 dura del orden de un año (**por confirmar en P0**, no probado). El OAuth2, **confirmado (2026-08-14) contra cuenta real**, dura entre **20 y 24 horas** (observado: 72260s y 87901s en dos tokens emitidos), no "del orden de una hora" como se asumía antes de verificar. Se refresca firmando con el OAuth1, sin pedir login: `garth.client.refresh_oauth2()` (interno, disparado automático por `Client.request()` cuando `oauth2_token.expired`) llama a `sso.exchange(oauth1_token, client)` y devuelve un token con `jti` distinto — confirmado comparando `jti` antes/después, no solo `expires_at`.

**Consecuencia de diseño**: solo el paso 1-5 vive en Python (`services/garmin-auth`). A partir del Bearer, todo es TypeScript. Ver ADR 0001.

Base de las llamadas de datos: `https://connectapi.garmin.com`, con `Authorization: Bearer <token>`.

### Notas operativas

- El `displayName` del usuario (necesario en varios paths) se obtiene del perfil social y **no** es el email.
- Garmin discrimina por User-Agent y por volumen. Un UA plausible y una cola con backoff no son opcionales. `garth` 0.6.3 usa por defecto el UA móvil `GCM-iOS-5.19.1.2` (`garth/http.py`), que es justo el flujo que Garmin rompió. **Confirmado (2026-08-14)**: sobreescribir `garth.client.sess.headers["User-Agent"]` con un UA de navegador antes de loguear destrabó el login contra cuenta real.
- Un 401 puede significar token expirado (refresh) o sesión invalidada (re-login completo). Distinguirlos es trabajo de P1. El refresh automático de `garth` no cubre el 401 real todavía (solo dispara por `expires_at` local vencido); falta probar qué devuelve Garmin ante un 401 genuino (sesión invalidada) y si `refresh_oauth2()` lo maneja o hace falta re-login completo.
- Endpoint de perfil, **confirmado (2026-08-14)**: `GET /userprofile-service/socialProfile`. `garth.client.username` expone `userProfile["userName"]`. En la cuenta probada, `userName` es igual al email de login (no asumir que siempre difiere; falta confirmar `displayName` por separado).
- Persistencia de sesión: `garth.save(dir)` escribe `oauth1_token.json` y `oauth2_token.json` **en texto plano** en `dir` (`garth/http.py: Client.dump`). No es apto para producción tal cual; en el spike de P0 el directorio vive fuera del repo y nunca se commitea.
- Versión de `garth` fijada para el spike de P0: **0.6.3** (la 0.8.0 está rota para logins nuevos, ver "Roturas y cambios").
- **Confirmado (2026-08-14, P1)**: `services/garmin-auth` real (FastAPI) probado contra la cuenta real. `POST /login` con credenciales válidas responde `status: success` directo (esta cuenta no tiene MFA, ese camino sigue sin probar). `POST /refresh` con el par OAuth1 emite un OAuth2 nuevo con `jti` distinto, igual que en el spike de P0. Login con credenciales inválidas/vacías: Garmin devuelve **401** en el POST de `/sso/signin` (no una página de error con 200), y `services/garmin-auth` lo traduce a `INVALID_CREDENTIALS`.

---

## Endpoints

Los paths listados salen de leer los wrappers, no de nuestra verificación. **Confirmar uno a uno en P0/P1 y actualizar el estado.**

| Área | Operación | Método | Estado | Notas |
|---|---|---|---|---|
| Perfil | displayName y datos de cuenta | GET | **confirmado** (2026-08-14) | `GET /userprofile-service/socialProfile`. Fixture completa no guardada (tiene PII); campos vistos: `displayName` (UUID, no el email), `fullName`, `userName` (= email en la cuenta probada) |
| Actividades | listar con paginación | GET | **confirmado** (2026-08-14) | `GET /activitylist-service/activities/search/activities?limit=&start=`. Fixture anonimizada: `docs/fixtures/activities-list.anon.json` |
| Actividades | detalle por id | GET | por confirmar | `GET /activity-service/activity/{activity_id}` (leído en `garth/data/activity.py`, sin probar). Payload grande, guardar en `raw` |
| Actividades | splits / laps / detalles GPS | GET | por confirmar | Endpoints separados del detalle |
| Métricas | resumen diario del usuario | GET | por confirmar | `GET /usersummary-service/usersummary/daily/{displayName}?calendarDate=YYYY-MM-DD` (leído en `python-garminconnect/__init__.py: get_user_summary`, sin probar). Requiere `displayName` (de `/userprofile-service/socialProfile`, no el email) |
| Métricas | sueño diario | GET | por confirmar | Estructura distinta al resumen |
| Métricas | HRV, body battery, stress | GET | por confirmar | Endpoints separados |
| Workouts | listar | GET | **confirmado** (2026-08-14) | `GET /workout-service/workouts?start=&limit=`. 21 workouts reales en la cuenta probada |
| Workouts | detalle por id | GET | **confirmado** (2026-08-14) | `GET /workout-service/workout/{workout_id}`. **Fuente de verdad de las constantes**, ver `workout-dsl.md` |
| Workouts | crear | POST | **confirmado** (2026-08-14) | `POST /workout-service/workout`, body = el JSON completo del workout (sin `workoutId`, lo asigna el servidor). Probado: workout de running (warmup por tiempo + 1 interval por distancia con `pace.zone`) creado OK, devuelve `workoutId`. Payload de ejemplo en `workout-dsl.md` |
| Workouts | actualizar | PUT | por confirmar | `PUT /workout-service/workout/{workout_id}`, reemplaza el workout completo (no parcial) |
| Workouts | borrar | DELETE | por confirmar | `DELETE /workout-service/workout/{workout_id}` |
| Workouts | descargar `.fit` | GET | por confirmar | `GET /workout-service/workout/FIT/{workout_id}` |
| Workouts | agendar en fecha | POST | **confirmado** (2026-08-14) | `POST /workout-service/schedule/{workout_id}`, body `{"date": "YYYY-MM-DD"}`. Devuelve `workoutScheduleId` + el workout completo + `calendarDate` |
| Workouts | quitar de agenda | DELETE | por confirmar | `DELETE /workout-service/schedule/{scheduled_workout_id}` (no borra el workout, solo la fecha) |
| Workouts | ver agenda por mes | GET | por confirmar | `GET /calendar-service/calendar/year/{year}/month/{month-1}` (mes 0-indexado) |
| Workouts | **push directo al dispositivo** | POST | **confirmado** (2026-08-14) | `POST /device-service/devicemessage/messages`, body: lista con `deviceId`, `messageUrl: "workout-service/workout/FIT/{workout_id}"`, `messageType: "workouts"`, `fileType: "FIT"`, `metaDataId: workout_id`. Responde con `messageStatus: "new"` y `messageId`. Ver "Pregunta abierta" abajo |
| Dispositivos | listar dispositivos | GET | **confirmado** (2026-08-14) | `GET /device-service/deviceregistration/devices`. Payload grande (capacidades del dispositivo) e incluye `serialNumber` — **PII, nunca fixture sin anonimizar** |
| Dispositivos | último dispositivo usado | GET | por confirmar | `GET /device-service/deviceservice/mylastused` |
| Upload | subir `.fit` | POST | por confirmar | Multipart |

### Pregunta abierta importante — resuelta (2026-08-14)

¿Existe un endpoint de *push* directo al dispositivo, o el workout solo baja cuando el reloj sincroniza con Garmin Connect? **Sí existe y lo confirmamos contra la cuenta real**: `POST /device-service/devicemessage/messages` es el equivalente API del botón "cargar al reloj" que existe en la sesión del workout dentro de la app. La llamada devuelve `messageStatus: "new"` — el mensaje queda encolado para el dispositivo, no confirmado como entregado.

**Lo que la API NO hace**: no fuerza el salto Bluetooth/WiFi teléfono↔reloj. Ese hop lo sigue haciendo Garmin Connect Mobile — nuestro push dispara la misma cola que dispara el botón manual, pero de ahí el mensaje `"new"` pasa a entregado recién cuando el teléfono sincroniza con el reloj (o, si el dispositivo tiene `wifiSetup: true`, potencialmente por WiFi directo — no probado, el reloj de prueba tiene `wifiSetup: false`).

**Consecuencia para el producto**: la tool MCP puede prometer "encolado para tu reloj", nunca "ya está en tu reloj" — la entrega final depende de que el usuario tenga Garmin Connect Mobile sincronizando. Esto es lo mismo que promete la propia app de Garmin, no es una limitación nuestra.

---

## Roturas y cambios

| Fecha | Qué se rompió | Causa | Fix |
|---|---|---|---|
| 2026-08-14 | `garth` 0.8.0 no completa login nuevo (según discusión `matin/garth#222`) | Garmin cambió el flujo de auth móvil del que dependía `garth`. `0.7.0+` reporta 429. | **Confirmado (2026-08-14)**: `garth==0.6.3` + forzar `User-Agent` de navegador en `garth.client.sess.headers` antes de `garth.login()`. Probado contra cuenta real, login exitoso (cuenta sin MFA). `matin/garth` sigue deprecado y sin mantenimiento; este fix puede dejar de funcionar sin aviso. Alternativas de fondo si vuelve a romperse: `garmin-connect-mcp` (Playwright), `garmin-health-data` (`curl_cffi`), ninguna probada por nosotros. |

---

## Límites y buenas prácticas

- Nunca hacer fan-out de requests. Todo pasa por la cola.
- Backoff exponencial ante 429 y 5xx; parar del todo tras N fallos y marcar la credencial como degradada en vez de reintentar en bucle.
- Sync incremental por fecha: no repescar el histórico entero cada vez.
- Nunca llamar a Garmin desde tests.
