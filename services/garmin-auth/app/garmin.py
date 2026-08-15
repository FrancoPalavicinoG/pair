from garth import sso
from garth.auth_tokens import OAuth1Token, OAuth2Token
from garth.exc import GarthException, GarthHTTPError
from garth.http import Client

from .errors import (
    INVALID_CREDENTIALS,
    MFA_INVALID,
    RATE_LIMITED,
    SSO_CHANGED,
    GarminAuthError,
)

# garth por defecto manda un User-Agent movil (GCM-iOS-...) que es justo el
# flujo que Garmin rompio en 2026. Un UA de navegador destraba el login
# (confirmado en P0, ver docs/garmin-api.md).
BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def _new_client() -> Client:
    # Un Client nuevo por request, no el singleton global de garth: cada
    # Client trae su propia sesion de requests (cookies incluidas), asi que
    # dos logins concurrentes de usuarios distintos no se pisan entre si.
    client = Client()
    client.sess.headers.update({"User-Agent": BROWSER_USER_AGENT})
    return client


def _translate(error: GarthException) -> GarminAuthError:
    # garth mete cualquier respuesta HTTP no-2xx en GarthHTTPError via
    # raise_for_status(); el status code de Garmin es la unica pista real
    # que tenemos para distinguir "credenciales malas" de "Garmin cambio algo".
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


def start_login(
    email: str, password: str
) -> tuple[str, tuple[OAuth1Token, OAuth2Token] | dict]:
    # sso.login() hace la parte fea del SSO de Garmin en un solo call:
    #   1. GET a sso.garmin.com para levantar cookies de sesion.
    #   2. GET al formulario de login, saca el token CSRF del HTML.
    #   3. POST de email+password+CSRF a ese mismo formulario.
    #   4. Si el HTML de respuesta tiene "MFA" en el titulo, hace falta un
    #      segundo paso -> con return_on_mfa=True, en vez de pedir el codigo
    #      por input() (que es lo que hace por defecto), corta ahi y nos
    #      devuelve el estado para que lo terminemos nosotros en /mfa.
    #   5. Si no hay MFA, extrae el "ticket" del HTML y lo cambia por el
    #      par OAuth1 + OAuth2 (dos requests mas, internas a sso.login()).
    client = _new_client()
    try:
        result = sso.login(email, password, client=client, return_on_mfa=True)
    except GarthException as e:
        raise _translate(e) from e
    # Sin MFA: result es (OAuth1Token, OAuth2Token).
    # Con MFA: result es ("needs_mfa", {"signin_params":..., "client": client}).
    # El dict de MFA guarda el Client vivo (con las cookies ya puestas por el
    # paso 1-3) porque el POST del codigo tiene que ir en esa misma sesion,
    # no se puede reconstruir despues con datos sueltos.
    if isinstance(result[0], str) and result[0] == "needs_mfa":
        return "mfa_required", result[1]
    return "success", result


def complete_mfa(client_state: dict, code: str) -> tuple[OAuth1Token, OAuth2Token]:
    # resume_login() retoma el Client guardado en start_login(), postea el
    # codigo MFA en el mismo formulario, y si Garmin lo acepta sigue el
    # mismo camino que un login sin MFA (ticket -> OAuth1 -> OAuth2).
    try:
        return sso.resume_login(client_state, code)
    except GarthException as e:
        raise GarminAuthError(MFA_INVALID, str(e)) from e


def refresh(oauth1_token: OAuth1Token) -> OAuth2Token:
    # sso.exchange() no vuelve a pasar por el SSO ni pide nada al usuario:
    # firma un request con oauth_token/oauth_token_secret (OAuth1, dura
    # ~1 año) contra el endpoint de exchange de Garmin, que devuelve un
    # OAuth2 (Bearer) nuevo. Es la misma llamada que garth hace sola cuando
    # el OAuth2 esta vencido durante un uso normal.
    client = _new_client()
    try:
        return sso.exchange(oauth1_token, client)
    except GarthException as e:
        raise _translate(e) from e
