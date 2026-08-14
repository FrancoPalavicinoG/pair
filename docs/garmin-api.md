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

Estado: **por confirmar** (P0).

El flujo, a alto nivel:

1. Formulario SSO en `sso.garmin.com`, con parámetros de servicio y un token CSRF que hay que extraer del HTML.
2. POST de credenciales manteniendo cookies → devuelve un **ticket**.
3. Si la cuenta tiene MFA: paso intermedio con el código, conservando el estado de la sesión.
4. Ticket → **token OAuth1**, firmado con un consumer key/secret que Garmin no publica y que `garth` obtiene de un recurso público.
5. OAuth1 → **token OAuth2 (Bearer)**, que es el que usan todas las llamadas de datos.

Vidas útiles (**por confirmar en P0**): el OAuth1 dura del orden de un año, el OAuth2 del orden de una hora y se refresca firmando con el OAuth1.

**Consecuencia de diseño**: solo el paso 1-5 vive en Python (`services/garmin-auth`). A partir del Bearer, todo es TypeScript. Ver ADR 0001.

Base de las llamadas de datos: `https://connectapi.garmin.com`, con `Authorization: Bearer <token>`.

### Notas operativas

- El `displayName` del usuario (necesario en varios paths) se obtiene del perfil social y **no** es el email.
- Garmin discrimina por User-Agent y por volumen. Un UA plausible y una cola con backoff no son opcionales.
- Un 401 puede significar token expirado (refresh) o sesión invalidada (re-login completo). Distinguirlos es trabajo de P1.

---

## Endpoints

Los paths listados salen de leer los wrappers, no de nuestra verificación. **Confirmar uno a uno en P0/P1 y actualizar el estado.**

| Área | Operación | Método | Estado | Notas |
|---|---|---|---|---|
| Perfil | displayName y datos de cuenta | GET | por confirmar | Necesario para otros paths |
| Actividades | listar con paginación | GET | por confirmar | Params de inicio y límite; paginar con cuidado |
| Actividades | detalle por id | GET | por confirmar | Payload grande, guardar en `raw` |
| Actividades | splits / laps / detalles GPS | GET | por confirmar | Endpoints separados del detalle |
| Métricas | resumen diario del usuario | GET | por confirmar | Por fecha |
| Métricas | sueño diario | GET | por confirmar | Estructura distinta al resumen |
| Métricas | HRV, body battery, stress | GET | por confirmar | Endpoints separados |
| Workouts | listar | GET | por confirmar | |
| Workouts | detalle por id | GET | por confirmar | **Fuente de verdad de las constantes** |
| Workouts | crear | POST | por confirmar | Payload en `workout-dsl.md` |
| Workouts | actualizar / borrar | PUT/DELETE | por confirmar | |
| Workouts | agendar en fecha | POST | por confirmar | Es lo que hace que llegue al reloj |
| Dispositivos | listar dispositivos | GET | por confirmar | Para mostrar a qué reloj va |
| Upload | subir `.fit` | POST | por confirmar | Multipart |

### Pregunta abierta importante

¿Existe un endpoint de *push* directo al dispositivo, o el workout solo baja cuando el reloj sincroniza con Garmin Connect? La hipótesis de trabajo es la segunda: **agendar es lo que provoca la bajada, y el timing depende del sync del reloj**. Confirmar en P0, porque cambia lo que le prometemos al usuario en la UI y en la respuesta de la tool MCP.

---

## Roturas y cambios

| Fecha | Qué se rompió | Causa | Fix |
|---|---|---|---|
| — | — | — | — |

---

## Límites y buenas prácticas

- Nunca hacer fan-out de requests. Todo pasa por la cola.
- Backoff exponencial ante 429 y 5xx; parar del todo tras N fallos y marcar la credencial como degradada en vez de reintentar en bucle.
- Sync incremental por fecha: no repescar el histórico entero cada vez.
- Nunca llamar a Garmin desde tests.
