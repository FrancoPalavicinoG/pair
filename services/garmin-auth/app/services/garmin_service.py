import time
import uuid

from garth import sso
from garth.auth_tokens import OAuth1Token, OAuth2Token
from garth.exc import GarthException, GarthHTTPError
from garth.http import Client

from ..errors import (
    INVALID_CREDENTIALS,
    MFA_INVALID,
    RATE_LIMITED,
    SESSION_EXPIRED,
    SSO_CHANGED,
    GarminAuthError,
)

# El UA movil por defecto de garth es lo que Garmin bloquea; uno de navegador funciona (ver docs/garmin-api.md).
BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Guarda un Client vivo de garth (con cookies), no serializable — por eso solo vive en memoria, nunca en DB.
_MFA_SESSION_TTL_SECONDS = 300
_mfa_sessions: dict[str, tuple[dict, float]] = {}


def _new_client() -> Client:
    # Client nuevo por request (no el singleton de garth) para que logins concurrentes no compartan cookies.
    client = Client()
    client.sess.headers.update({"User-Agent": BROWSER_USER_AGENT})
    return client


def _translate(error: GarthException) -> GarminAuthError:
    # El status HTTP de Garmin es la unica pista para distinguir credenciales malas de un cambio en el flujo.
    if isinstance(error, GarthHTTPError):
        status = getattr(getattr(error.error, "response", None), "status_code", None)
        if status == 429:
            return GarminAuthError(RATE_LIMITED, "Garmin rate-limited this request")
        if status in (401, 403):
            return GarminAuthError(
                INVALID_CREDENTIALS, "Garmin rejected the credentials"
            )
        return GarminAuthError(SSO_CHANGED, str(error))
    return GarminAuthError(INVALID_CREDENTIALS, str(error))


def _create_mfa_session(client_state: dict) -> str:
    session_id = str(uuid.uuid4())
    _mfa_sessions[session_id] = (client_state, time.time() + _MFA_SESSION_TTL_SECONDS)
    return session_id


def _pop_mfa_session(session_id: str) -> dict | None:
    entry = _mfa_sessions.pop(session_id, None)
    if entry is None:
        return None
    client_state, expires_at = entry
    if expires_at < time.time():
        return None
    return client_state


def start_login(
    email: str, password: str
) -> tuple[str, tuple[OAuth1Token, OAuth2Token] | str]:
    # sso.login() hace todo el SSO de Garmin (CSRF, POST de credenciales, ticket -> OAuth1 -> OAuth2).
    # Con return_on_mfa=True, si hace falta MFA corta ahi y devuelve el estado para terminarlo en /mfa.
    client = _new_client()
    try:
        result = sso.login(email, password, client=client, return_on_mfa=True)
    except GarthException as e:
        raise _translate(e) from e
    if isinstance(result[0], str) and result[0] == "needs_mfa":
        session_id = _create_mfa_session(result[1])
        return "mfa_required", session_id
    return "success", result


def complete_mfa(session_id: str, code: str) -> tuple[OAuth1Token, OAuth2Token]:
    client_state = _pop_mfa_session(session_id)
    if client_state is None:
        raise GarminAuthError(SESSION_EXPIRED, "MFA session not found or expired")
    # Retoma el Client de start_login(), postea el codigo, y sigue el mismo camino que un login sin MFA.
    try:
        return sso.resume_login(client_state, code)
    except GarthException as e:
        raise GarminAuthError(MFA_INVALID, str(e)) from e


def refresh(oauth1_token: OAuth1Token) -> OAuth2Token:
    # Firma con el OAuth1 (dura ~1 año) contra el endpoint de exchange de Garmin; no pasa por el SSO de nuevo.
    client = _new_client()
    try:
        return sso.exchange(oauth1_token, client)
    except GarthException as e:
        raise _translate(e) from e
