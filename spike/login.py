"""
Spike de autenticacion P0 - PAIR. Script suelto, fuera del repo, no se commitea.

garth 0.8.0 esta roto para logins nuevos (Garmin cambio el flujo de auth movil
del que dependia garth). Este script fija garth==0.6.3 y fuerza un User-Agent
de navegador porque el UA movil por defecto (GCM-iOS-5.19.1.2) es justo lo que
Garmin bloquea. Ver docs/garmin-api.md, seccion "Roturas y cambios" (2026-08-14).

Uso:
    .venv/bin/python login.py

Primera corrida: pide email, password y (si aplica) codigo MFA por input().
Corridas siguientes: si encuentra sesion guardada en .garth-session/, la
recarga sin volver a pedir login (para validar que el refresh/reload funciona).
"""

import getpass
import os
import stat

import garth
from garth.exc import GarthException

SESSION_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".garth-session")

BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def _lock_down(path: str) -> None:
    """Los tokens quedan en texto plano en disco (asi los guarda garth).
    Al menos que solo los pueda leer este usuario."""
    os.chmod(path, stat.S_IRWXU)
    for fname in ("oauth1_token.json", "oauth2_token.json"):
        fpath = os.path.join(path, fname)
        if os.path.exists(fpath):
            os.chmod(fpath, stat.S_IRUSR | stat.S_IWUSR)


def main() -> None:
    garth.client.sess.headers.update({"User-Agent": BROWSER_USER_AGENT})

    if os.path.isdir(SESSION_DIR) and os.listdir(SESSION_DIR):
        print(f"Sesion guardada encontrada en {SESSION_DIR}, la recargo sin pedir login...")
        garth.resume(SESSION_DIR)
        try:
            username = garth.client.username
        except GarthException as e:
            print("La sesion guardada no es valida:", e)
            return
        print("Sesion valida. username:", username)
        return

    print("No hay sesion guardada. Login interactivo.")
    email = input("Email de Garmin: ")
    password = getpass.getpass("Password de Garmin: ")

    try:
        garth.login(email, password)
    except GarthException as e:
        print("Fallo el login:", e)
        return

    os.makedirs(SESSION_DIR, exist_ok=True)
    garth.save(SESSION_DIR)
    _lock_down(SESSION_DIR)

    print("Login OK. Sesion guardada en", SESSION_DIR)
    print("username:", garth.client.username)


if __name__ == "__main__":
    main()
