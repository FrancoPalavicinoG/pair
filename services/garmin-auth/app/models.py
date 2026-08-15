from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class MfaRequest(BaseModel):
    session_id: str
    code: str


# Par de larga vida (~1 año). No pega directo a la API de Garmin: sirve
# para firmar el pedido que canjea por un OAuth2 nuevo (ver /refresh).
class OAuth1TokenModel(BaseModel):
    oauth_token: str
    oauth_token_secret: str
    mfa_token: str | None = None
    domain: str | None = None


# El Bearer de corta vida (~20-24h) que va en el header Authorization de
# cada llamada real a la API de Garmin.
class OAuth2TokenModel(BaseModel):
    scope: str
    jti: str
    token_type: str
    access_token: str
    refresh_token: str
    expires_in: int
    expires_at: int
    refresh_token_expires_in: int
    refresh_token_expires_at: int


class TokensResponse(BaseModel):
    status: str = "success"
    oauth1: OAuth1TokenModel
    oauth2: OAuth2TokenModel


class MfaRequiredResponse(BaseModel):
    status: str = "mfa_required"
    session_id: str


class RefreshRequest(BaseModel):
    oauth1: OAuth1TokenModel


class RefreshResponse(BaseModel):
    oauth2: OAuth2TokenModel


class ErrorResponse(BaseModel):
    code: str
    message: str
