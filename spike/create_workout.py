"""
Spike P0 - tarea #6: crear un workout simple de running via POST.

Endpoint y shape del payload confirmados leyendo:
- python-garminconnect/workout.py (helpers create_warmup_step,
  create_distance_interval_step, BaseWorkout.to_dict) para la forma minima.
- El dump real de un workout propio (spike/.raw-dumps/workout-detail-sample.raw.json,
  ver docs/workout-dsl.md) para los valores de stepType/conditionType/targetType
  y las unidades (metros, m/s).

Pace pedido: 4:10-4:45 /km. Conversion a velocidad (m/s = 1000 / segundos_por_km):
  4:10/km = 250s/km -> 4.0 m/s        (mas rapido -> targetValueOne)
  4:45/km = 285s/km -> 3.508772 m/s   (mas lento   -> targetValueTwo)

Requiere haber corrido login.py antes. Esto ES una escritura real: crea un
workout visible en tu cuenta de Garmin (no lo agenda todavia, eso es la
tarea #7).

Uso:
    .venv/bin/python create_workout.py
"""

import os

import garth
from garth.exc import GarthException

HERE = os.path.dirname(os.path.abspath(__file__))
SESSION_DIR = os.path.join(HERE, ".garth-session")

BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

RUNNING_SPORT_TYPE = {"sportTypeId": 1, "sportTypeKey": "running", "displayOrder": 1}

WORKOUT_PAYLOAD = {
    "workoutName": "PAIR spike test",
    "sportType": RUNNING_SPORT_TYPE,
    "estimatedDurationInSecs": 570,
    "workoutSegments": [
        {
            "segmentOrder": 1,
            "sportType": RUNNING_SPORT_TYPE,
            "workoutSteps": [
                {
                    "type": "ExecutableStepDTO",
                    "stepOrder": 1,
                    "stepType": {"stepTypeId": 1, "stepTypeKey": "warmup", "displayOrder": 1},
                    "endCondition": {
                        "conditionTypeId": 2,
                        "conditionTypeKey": "time",
                        "displayOrder": 2,
                        "displayable": True,
                    },
                    "endConditionValue": 300.0,
                    "targetType": {
                        "workoutTargetTypeId": 1,
                        "workoutTargetTypeKey": "no.target",
                        "displayOrder": 1,
                    },
                },
                {
                    "type": "ExecutableStepDTO",
                    "stepOrder": 2,
                    "stepType": {"stepTypeId": 3, "stepTypeKey": "interval", "displayOrder": 3},
                    "endCondition": {
                        "conditionTypeId": 3,
                        "conditionTypeKey": "distance",
                        "displayOrder": 3,
                        "displayable": True,
                    },
                    "endConditionValue": 1000.0,
                    "targetType": {
                        "workoutTargetTypeId": 6,
                        "workoutTargetTypeKey": "pace.zone",
                        "displayOrder": 6,
                    },
                    "targetValueOne": 4.0,
                    "targetValueTwo": 3.508772,
                },
            ],
        }
    ],
}


def main() -> None:
    if not os.path.isdir(SESSION_DIR) or not os.listdir(SESSION_DIR):
        print("No hay sesion guardada. Corre login.py primero.")
        return

    garth.client.sess.headers.update({"User-Agent": BROWSER_USER_AGENT})
    garth.resume(SESSION_DIR)

    print("Creando workout:", WORKOUT_PAYLOAD["workoutName"])
    try:
        result = garth.client.connectapi(
            "/workout-service/workout", method="POST", json=WORKOUT_PAYLOAD
        )
    except GarthException as e:
        print("Fallo la creacion:", e)
        return

    workout_id = result.get("workoutId")
    print("Workout creado OK. workoutId:", workout_id)
    print("Revisalo en la app de Garmin Connect (seccion Entrenamientos).")
    if workout_id:
        print(f"\nGuarda este id para la tarea #7 (agendar): {workout_id}")


if __name__ == "__main__":
    main()
