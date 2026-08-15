from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from garth.auth_tokens import OAuth1Token, OAuth2Token

from . import garmin, sessions
from .errors import SESSION_EXPIRED, GarminAuthError
from .models import (
    ErrorResponse,
    LoginRequest,
    MfaRequest,
    MfaRequiredResponse,
    OAuth1TokenModel,
    OAuth2TokenModel,
    RefreshRequest,
    RefreshResponse,
    TokensResponse,
)
from .settings import settings

app = FastAPI(title="garmin-auth")


def require_shared_secret(
    x_shared_secret: Annotated[str | None, Header()] = None,
) -> None:
    # Este servicio solo deberia ser alcanzable desde la red interna (nunca
    # expuesto a internet), pero igual valida un secreto compartido en cada
    # request como segunda barrera, no solo confia en la red.
    if x_shared_secret != settings.shared_secret:
        raise HTTPException(status_code=401, detail="invalid shared secret")


@app.exception_handler(GarminAuthError)
def handle_garmin_auth_error(_request: Request, exc: GarminAuthError) -> JSONResponse:
    # Cualquier GarminAuthError levantado en garmin.py o en un endpoint cae
    # aca y se convierte en el mismo shape de error para todos los casos:
    # {"code": "...", "message": "..."}, nunca un stack trace de garth.
    return JSONResponse(
        status_code=401,
        content=ErrorResponse(code=exc.code, message=exc.message).model_dump(),
    )


def _oauth2_model(oauth2: OAuth2Token) -> OAuth2TokenModel:
    # Copia campo por campo desde el dataclass de garth a nuestro propio
    # modelo de respuesta: la forma que exponemos es la nuestra, no la de
    # garth (si garth le cambia un campo interno, no se filtra para afuera).
    return OAuth2TokenModel(
        **{f: getattr(oauth2, f) for f in OAuth2TokenModel.model_fields}
    )


def _tokens_response(oauth1: OAuth1Token, oauth2: OAuth2Token) -> TokensResponse:
    return TokensResponse(
        oauth1=OAuth1TokenModel(
            oauth_token=oauth1.oauth_token,
            oauth_token_secret=oauth1.oauth_token_secret,
            mfa_token=oauth1.mfa_token,
            domain=oauth1.domain,
        ),
        oauth2=_oauth2_model(oauth2),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/login", dependencies=[Depends(require_shared_secret)])
def login(body: LoginRequest) -> TokensResponse | MfaRequiredResponse:
    # Un solo intento de login puede terminar de dos formas: tokens directo,
    # o "hace falta MFA" con un session_id efimero que el caller manda a
    # /mfa junto con el codigo. La contraseña no se vuelve a necesitar en
    # ese segundo paso: ya quedo usada (y descartada) aca.
    status, result = garmin.start_login(body.email, body.password)
    if status == "mfa_required":
        session_id = sessions.create(result)
        return MfaRequiredResponse(session_id=session_id)
    oauth1, oauth2 = result
    return _tokens_response(oauth1, oauth2)


@app.post("/mfa", dependencies=[Depends(require_shared_secret)])
def mfa(body: MfaRequest) -> TokensResponse:
    client_state = sessions.pop(body.session_id)
    if client_state is None:
        raise GarminAuthError(SESSION_EXPIRED, "MFA session not found or expired")
    oauth1, oauth2 = garmin.complete_mfa(client_state, body.code)
    return _tokens_response(oauth1, oauth2)


@app.post("/refresh", dependencies=[Depends(require_shared_secret)])
def refresh(body: RefreshRequest) -> RefreshResponse:
    # El caller (el script de sync, mas adelante) manda el OAuth1 que ya
    # tenia guardado (descifrado de la DB); no hace falta email/password
    # para renovar el OAuth2, es la gracia de tener el OAuth1 de larga vida.
    oauth1 = OAuth1Token(
        oauth_token=body.oauth1.oauth_token,
        oauth_token_secret=body.oauth1.oauth_token_secret,
        mfa_token=body.oauth1.mfa_token,
        domain=body.oauth1.domain,
    )
    oauth2 = garmin.refresh(oauth1)
    return RefreshResponse(oauth2=_oauth2_model(oauth2))
