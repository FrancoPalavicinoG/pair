"""
Spike P0 - tarea #7: agendar (opcional, hoy para el test) y probar el push
directo al dispositivo, equivalente API del boton "cargar al reloj" de la
app. No intenta forzar el sync Bluetooth telefono<->reloj, eso lo sigue
haciendo Garmin Connect Mobile.

Endpoints confirmados leyendo python-garminconnect/__init__.py (sin probar
hasta ahora): schedule_workout, get_devices, push_workout_to_device.

Requiere haber corrido create_workout.py antes (o pasarle un workout_id).

Uso:
    .venv/bin/python schedule_and_push.py [workout_id]
"""

import datetime
import json
import os
import sys

import garth
from garth.exc import GarthException

HERE = os.path.dirname(os.path.abspath(__file__))
SESSION_DIR = os.path.join(HERE, ".garth-session")
RAW_DUMPS_DIR = os.path.join(HERE, ".raw-dumps")

BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

DEFAULT_WORKOUT_ID = 1664286235  # "PAIR spike test", creado en la tarea #6


def main() -> None:
    workout_id = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_WORKOUT_ID

    if not os.path.isdir(SESSION_DIR) or not os.listdir(SESSION_DIR):
        print("No hay sesion guardada. Corre login.py primero.")
        return

    garth.client.sess.headers.update({"User-Agent": BROWSER_USER_AGENT})
    garth.resume(SESSION_DIR)
    os.makedirs(RAW_DUMPS_DIR, exist_ok=True)

    try:
        # 1. Agendar para hoy. Opcional en general (a veces solo se quiere
        #    el workout en la libreria, sin fecha) - hoy lo hacemos porque
        #    el test lo necesita.
        today = datetime.date.today().isoformat()
        print(f"Agendando workout {workout_id} para {today}...")
        schedule_result = garth.client.connectapi(
            f"/workout-service/schedule/{workout_id}", method="POST", json={"date": today}
        )
        print("Agendado OK.")

        # 2. Dispositivo destino.
        devices = garth.client.connectapi("/device-service/deviceregistration/devices")
        assert isinstance(devices, list) and devices, "No hay dispositivos en la cuenta"
        device_id = devices[0]["deviceId"]
        device_name = devices[0].get("displayName") or devices[0].get("productDisplayName", "?")
        print(f"Dispositivo destino: {device_name} ({device_id})")

        # 3. Nombre del workout (lo pide el payload de push).
        workout = garth.client.connectapi(f"/workout-service/workout/{workout_id}")
        workout_name = workout["workoutName"]

        # 4. Push directo, equivalente al boton "cargar al reloj".
        push_payload = [
            {
                "deviceId": device_id,
                "messageUrl": f"workout-service/workout/FIT/{workout_id}",
                "messageType": "workouts",
                "groupName": None,
                "messageName": workout_name,
                "priority": 1,
                "fileType": "FIT",
                "metaDataId": workout_id,
            }
        ]
        print("Enviando push al dispositivo...")
        push_result = garth.client.connectapi(
            "/device-service/devicemessage/messages", method="POST", json=push_payload
        )
        print("Push OK.")

    except GarthException as e:
        print("Fallo en algun paso:", e)
        return

    dump = {"schedule_result": schedule_result, "devices": devices, "push_result": push_result}
    dump_path = os.path.join(RAW_DUMPS_DIR, "schedule-and-push.raw.json")
    with open(dump_path, "w") as f:
        json.dump(dump, f, indent=2, default=str)
    print(f"\nRespuestas crudas guardadas en {dump_path} (fuera del repo).")
    print("Proximo paso manual: revisa la app de Garmin Connect Mobile y,")
    print("si sincroniza con el reloj, el reloj mismo.")


if __name__ == "__main__":
    main()
