"""
Spike P0: anonimiza el dump crudo de actividades para poder commitearlo
como fixture real en docs/fixtures/. Se commitea (no tiene secretos),
a diferencia de .raw-dumps/ y .garth-session/ que nunca se suben.

Reemplaza/quita: nombre, email, displayName real, urls de foto de perfil,
ownerId, deviceId, activityId/activityUUID reales, userRoles (ruido, no
hace falta para tests de parser), y desplaza fecha real -> fecha fija de
referencia (se mantiene la hora del dia, se pierde la fecha real).

Uso:
    .venv/bin/python anonymize_activities.py
"""

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, ".raw-dumps", "activities.raw.json")
DEST = os.path.join(HERE, "..", "docs", "fixtures", "activities-list.anon.json")

REF_DATE = "2024-01-15"  # fecha fija de referencia, no la fecha real de la actividad

DROP_KEYS = {
    "ownerId",
    "ownerDisplayName",
    "ownerFullName",
    "ownerProfileImageUrlSmall",
    "ownerProfileImageUrlMedium",
    "ownerProfileImageUrlLarge",
    "userRoles",
}


def shift_datetime(value: str) -> str:
    # "YYYY-MM-DD HH:MM:SS" -> misma hora, fecha de referencia fija
    time_part = value.split(" ", 1)[1]
    return f"{REF_DATE} {time_part}"


def anonymize_activity(a: dict, fake_id: int) -> dict:
    out = {k: v for k, v in a.items() if k not in DROP_KEYS}
    out["activityId"] = fake_id
    out["activityUUID"] = f"00000000-0000-4000-8000-{fake_id:012d}"
    out["deviceId"] = 1234567890
    for key in ("startTimeLocal", "startTimeGMT", "endTimeGMT"):
        if out.get(key):
            out[key] = shift_datetime(out[key])
    out["beginTimestamp"] = None  # derivado de la fecha real, no lo recalculamos a mano
    return out


def main() -> None:
    with open(SRC) as f:
        raw = json.load(f)

    anonymized = [
        anonymize_activity(a, fake_id=i + 1)
        for i, a in enumerate(raw["activities"])
    ]

    os.makedirs(os.path.dirname(DEST), exist_ok=True)
    with open(DEST, "w") as f:
        json.dump(anonymized, f, indent=2)

    print(f"Fixture anonimizada escrita en {os.path.abspath(DEST)}")
    print("Revisala a mano antes de confiar en que no quedo nada identificable.")


if __name__ == "__main__":
    main()
