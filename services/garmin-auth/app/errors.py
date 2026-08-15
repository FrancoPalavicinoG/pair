# Codigos estables que devuelve el servicio en vez de propagar el mensaje
# crudo de garth/Garmin. Quien los consume (el script de sync, mas
# adelante la web) reacciona al codigo, no al texto.
# email/password rechazados por Garmin (401/403 en el signin).
INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
# el codigo de /mfa no fue aceptado.
MFA_INVALID = "MFA_INVALID"
# Garmin devolvio 429.
RATE_LIMITED = "RATE_LIMITED"
# fallo inesperado: Garmin probablemente cambio algo en el flujo.
SSO_CHANGED = "SSO_CHANGED"
# el session_id de /mfa no existe o vencio (TTL 5 min).
SESSION_EXPIRED = "SESSION_EXPIRED"


# Unica excepcion que garmin.py levanta hacia afuera; el handler de
# main.py la convierte en {"code", "message"} en vez de un stack trace.
class GarminAuthError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message
