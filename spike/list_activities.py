"""
Spike P0 - tarea #4 (Parte 1, lectura): confirmar la conexion con un GET simple.

Endpoint confirmado leyendo garth/data/activity.py (Activity.list, no
inventado): GET /activitylist-service/activities/search/activities

Guarda el JSON crudo en .raw-dumps/ (gitignoreado, nunca se commitea) para
poder armar despues, a mano, una fixture anonimizada en docs/fixtures/.
Por consola solo imprime un resumen chico, sin coordenadas ni datos crudos.

Requiere haber corrido login.py antes.

Uso:
    .venv/bin/python list_activities.py
"""

import json
import os

import garth
from garth.exc import GarthException

HERE = os.path.dirname(os.path.abspath(__file__))
SESSION_DIR = os.path.join(HERE, ".garth-session")
RAW_DUMPS_DIR = os.path.join(HERE, ".raw-dumps")

BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

ACTIVITIES_PATH = "/activitylist-service/activities/search/activities"


def main() -> None:
    if not os.path.isdir(SESSION_DIR) or not os.listdir(SESSION_DIR):
        print("No hay sesion guardada. Corre login.py primero.")
        return

    garth.client.sess.headers.update({"User-Agent": BROWSER_USER_AGENT})
    garth.resume(SESSION_DIR)

    try:
        profile = garth.client.connectapi("/userprofile-service/socialProfile")
        print("Conexion OK. username:", garth.client.username)

        activities = garth.client.connectapi(ACTIVITIES_PATH, params={"limit": 5, "start": 0})
    except GarthException as e:
        print("Fallo el GET:", e)
        return

    assert isinstance(activities, list), f"Esperaba una lista, llego {type(activities)}"
    print(f"\n{len(activities)} actividad(es) recibidas:")
    for a in activities:
        name = a.get("activityName", "(sin nombre)")
        atype = (a.get("activityType") or {}).get("typeKey", "?")
        duration = a.get("duration")
        duration_min = f"{duration / 60:.0f} min" if duration else "?"
        print(f"  - {name} [{atype}] ~{duration_min}")

    os.makedirs(RAW_DUMPS_DIR, exist_ok=True)
    raw_path = os.path.join(RAW_DUMPS_DIR, "activities.raw.json")
    with open(raw_path, "w") as f:
        json.dump({"profile": profile, "activities": activities}, f, indent=2, default=str)

    print(f"\nJSON crudo guardado en {raw_path} (fuera del repo via .gitignore).")
    print("Proximo paso (a mano, no automatico): armar una version anonimizada")
    print("de 1 actividad en docs/fixtures/ antes de commitear nada de esto.")


if __name__ == "__main__":
    main()
