# Estado intermedio del login cuando Garmin pide MFA: no es JSON, es un
# dict de garth con un Client vivo adentro (cookies de la sesion de SSO ya
# abierta). Por eso no puede ir a una DB ni sobrevivir a un reinicio del
# proceso: solo existe en memoria, y se descarta despues de usarse o al
# vencer el TTL.
import time
import uuid

_TTL_SECONDS = 300
_sessions: dict[str, tuple[dict, float]] = {}


def create(client_state: dict) -> str:
    session_id = str(uuid.uuid4())
    _sessions[session_id] = (client_state, time.time() + _TTL_SECONDS)
    return session_id


def pop(session_id: str) -> dict | None:
    # pop, no get: una vez usado (o vencido) el session_id no sirve mas,
    # ni para reintentar ni para que alguien mas lo adivine.
    entry = _sessions.pop(session_id, None)
    if entry is None:
        return None
    client_state, expires_at = entry
    if expires_at < time.time():
        return None
    return client_state
