"""
Spike P0 - tarea #3: confirmar que el refresh de OAuth2 funciona.

garth refresca el OAuth2 solo (firmando con el OAuth1) cada vez que
Client.request() ve oauth2_token.expired == True (garth/http.py:167-172).
En vez de esperar ~1h a que expire solo, forzamos expires_at al pasado
en memoria y hacemos una llamada real para probar el refresh transparente.

Requiere haber corrido login.py antes (usa la sesion en .garth-session/).

Uso:
    .venv/bin/python refresh_check.py
"""

import os
import time

import garth
from garth.exc import GarthException

SESSION_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garth-session")

BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def main() -> None:
    if not os.path.isdir(SESSION_DIR) or not os.listdir(SESSION_DIR):
        print("No hay sesion guardada. Corre login.py primero.")
        return

    garth.client.sess.headers.update({"User-Agent": BROWSER_USER_AGENT})
    garth.resume(SESSION_DIR)

    old_jti = garth.client.oauth2_token.jti
    old_expires_at = garth.client.oauth2_token.expires_at
    print("jti original:", old_jti)
    print("expires_at original:", old_expires_at, "(en", int(old_expires_at - time.time()), "s)")

    garth.client.oauth2_token.expires_at = int(time.time()) - 60
    print("Forzado a expirado en memoria. Llamando refresh_oauth2() directo...")

    try:
        garth.client.refresh_oauth2()
    except GarthException as e:
        print("refresh_oauth2() fallo:", e)
        return

    new_jti = garth.client.oauth2_token.jti
    new_expires_at = garth.client.oauth2_token.expires_at
    print("jti nuevo:", new_jti)
    print("expires_at nuevo:", new_expires_at, "(en", int(new_expires_at - time.time()), "s)")

    if new_jti != old_jti:
        print("Refresh OK: jti distinto, Garmin emitio un token nuevo.")
    else:
        print("jti igual: no parece haberse emitido un token nuevo. Revisar a mano.")

    print("Confirmando que el token nuevo sirve para una llamada real...")
    try:
        garth.client.connectapi("/userprofile-service/socialProfile")
        print("Llamada OK con el token refrescado.")
    except GarthException as e:
        print("La llamada fallo incluso con el token refrescado:", e)


if __name__ == "__main__":
    main()
