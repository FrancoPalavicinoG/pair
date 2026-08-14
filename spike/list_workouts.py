"""
Spike P0 - tarea #5: ver que workouts ya existen antes de decidir si hace
falta crear uno nuevo.

Endpoint confirmado leyendo python-garminconnect/__init__.py (get_workouts),
no garth (garth no envuelve workouts). Reutilizamos la sesion de garth ya
autenticada, solo cambia el path.

Requiere haber corrido login.py antes.

Uso:
    .venv/bin/python list_workouts.py
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

WORKOUTS_PATH = "/workout-service/workouts"


def main() -> None:
    if not os.path.isdir(SESSION_DIR) or not os.listdir(SESSION_DIR):
        print("No hay sesion guardada. Corre login.py primero.")
        return

    garth.client.sess.headers.update({"User-Agent": BROWSER_USER_AGENT})
    garth.resume(SESSION_DIR)

    try:
        workouts = garth.client.connectapi(WORKOUTS_PATH, params={"start": 0, "limit": 100})
    except GarthException as e:
        print("Fallo el GET:", e)
        return

    assert isinstance(workouts, list), f"Esperaba una lista, llego {type(workouts)}"
    print(f"{len(workouts)} workout(s) en tu cuenta:\n")
    for w in workouts:
        wid = w.get("workoutId")
        name = w.get("workoutName", "(sin nombre)")
        sport = (w.get("sportType") or {}).get("sportTypeKey", "?")
        print(f"  - [{wid}] {name} ({sport})")

    if workouts:
        first_id = workouts[0]["workoutId"]
        detail = garth.client.connectapi(f"/workout-service/workout/{first_id}")
        os.makedirs(RAW_DUMPS_DIR, exist_ok=True)
        detail_path = os.path.join(RAW_DUMPS_DIR, "workout-detail-sample.raw.json")
        with open(detail_path, "w") as f:
            json.dump(detail, f, indent=2, default=str)
        print(f"\nDetalle del primero guardado en {detail_path} (fuera del repo).")
    else:
        print("\nNo hay workouts guardados en la cuenta todavia.")


if __name__ == "__main__":
    main()
