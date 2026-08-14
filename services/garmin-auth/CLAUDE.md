# services/garmin-auth

Sidecar Python. **Único componente que habla con el SSO de Garmin.**

Stack: Python 3.12, FastAPI, `garth`, `uv`, ruff, pytest.

## Alcance

Tres endpoints y nada más:

| Endpoint | Entrada | Salida |
|---|---|---|
| `POST /login` | email, password | tokens, o `mfa_required` + `session_id` |
| `POST /mfa` | session_id, código | tokens |
| `POST /refresh` | oauth1 token+secret | bearer OAuth2 nuevo |

`tokens` = par OAuth1 (token, secret, expiración) + bearer OAuth2 (valor, expiración).

**Si te piden añadir un endpoint que devuelva datos de Garmin (actividades, workouts, métricas), para y pregunta.** Eso va en `packages/core`, en TypeScript. Ese es el punto entero de la ADR 0001.

## Reglas

- La contraseña y el código MFA nunca se persisten, ni se loguean, ni entran en un mensaje de error. Existen solo en memoria durante la petición.
- La sesión MFA vive en memoria con TTL de 5 minutos. No va a DB, no sobrevive a un reinicio.
- El servicio no tiene base de datos. No cifra ni almacena: devuelve tokens y olvida. Quien cifra y guarda es la web.
- Solo accesible desde la red interna. Nunca expuesto a internet.
- Autenticación entre servicios con secreto compartido en cabecera; verificar en cada request.
- Errores de Garmin traducidos a códigos estables (`INVALID_CREDENTIALS`, `MFA_REQUIRED`, `MFA_INVALID`, `RATE_LIMITED`, `SSO_CHANGED`). `SSO_CHANGED` es la señal de que Garmin rompió el flujo: debe ser inconfundible en los logs.
- Fijar la versión de `garth`. Actualizarla es un cambio deliberado, con prueba manual de login real.

## Comandos

```bash
uv sync
uv run fastapi dev app/main.py
uv run pytest
uv run ruff check --fix .
```

## Tests

Sin red. Mockear `garth`. Lo que se prueba aquí es la máquina de estados (login → mfa → tokens) y que ningún camino de error filtre credenciales, no el SSO de Garmin.
