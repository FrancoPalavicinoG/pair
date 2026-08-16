from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from garth.auth_tokens import OAuth1Token, OAuth2Token

from ..models import (
    LoginRequest,
    MfaRequest,
    MfaRequiredResponse,
    OAuth1TokenModel,
    OAuth2TokenModel,
    RefreshRequest,
    RefreshResponse,
    TokensResponse,
)
from ..services import garmin_service
from ..settings import settings

router = APIRouter()


def require_shared_secret(
    x_shared_secret: Annotated[str | None, Header()] = None,
) -> None:
    # Solo deberia ser alcanzable desde la red interna; el secreto es una segunda barrera igual.
    if x_shared_secret != settings.shared_secret:
        raise HTTPException(status_code=401, detail="invalid shared secret")


def _oauth2_model(oauth2: OAuth2Token) -> OAuth2TokenModel:
    # Copia campo por campo: la forma que exponemos es la nuestra, no la de garth.
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


@router.post("/login", dependencies=[Depends(require_shared_secret)])
def login(body: LoginRequest) -> TokensResponse | MfaRequiredResponse:
    # Termina en tokens directo, o en mfa_required + session_id para completar en /mfa.
    status, result = garmin_service.start_login(body.email, body.password)
    if status == "mfa_required":
        return MfaRequiredResponse(session_id=result)
    oauth1, oauth2 = result
    return _tokens_response(oauth1, oauth2)


@router.post("/mfa", dependencies=[Depends(require_shared_secret)])
def mfa(body: MfaRequest) -> TokensResponse:
    oauth1, oauth2 = garmin_service.complete_mfa(body.session_id, body.code)
    return _tokens_response(oauth1, oauth2)


@router.post("/refresh", dependencies=[Depends(require_shared_secret)])
def refresh(body: RefreshRequest) -> RefreshResponse:
    # No hace falta email/password: el OAuth1 de larga vida alcanza para renovar el OAuth2.
    oauth1 = OAuth1Token(
        oauth_token=body.oauth1.oauth_token,
        oauth_token_secret=body.oauth1.oauth_token_secret,
        mfa_token=body.oauth1.mfa_token,
        domain=body.oauth1.domain,
    )
    oauth2 = garmin_service.refresh(oauth1)
    return RefreshResponse(oauth2=_oauth2_model(oauth2))
