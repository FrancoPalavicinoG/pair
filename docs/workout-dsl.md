# PairWorkout — DSL de entrenamientos

## Por qué existe

El JSON de workouts de Garmin es hostil: segmentos anidados, grupos de repetición, y constantes numéricas para todo (tipo de paso, condición de fin, tipo de objetivo, deporte). Exponerle eso a un LLM garantiza workouts silenciosamente incorrectos.

`PairWorkout` es la interfaz que ve Claude. Es plana, legible y validada con Zod. El traductor (`packages/core/src/workout/`) se come la complejidad.

**Principio**: cualquier cosa que el traductor no sepa expresar debe **fallar con un error explícito**. Nunca generar un workout parecido.

---

## Esquema

```ts
type PairWorkout = {
  name: string;                    // "Series 5x1000 - martes"
  sport: 'running' | 'cycling' | 'swimming' | 'strength';
  notes?: string;                  // lo que el entrenador escribió, tal cual
  steps: Step[];
};

type Step = SimpleStep | RepeatBlock;

type SimpleStep = {
  kind: 'warmup' | 'work' | 'recovery' | 'cooldown' | 'rest';
  duration: Duration;
  target?: Target;
  note?: string;                   // "controlado", "en subida"
};

type RepeatBlock = {
  kind: 'repeat';
  times: number;                   // 2..50
  steps: SimpleStep[];             // sin anidar otro repeat
};

type Duration =
  | { type: 'time'; seconds: number }
  | { type: 'distance'; meters: number }
  | { type: 'calories'; kcal: number }
  | { type: 'lapButton' }                       // hasta que el usuario pulse
  | { type: 'hrAbove'; bpm: number }
  | { type: 'hrBelow'; bpm: number };

type Target =
  | { type: 'none' }
  | { type: 'pace'; minPerKm: [number, number] }   // [rápido, lento]
  | { type: 'speed'; kmh: [number, number] }
  | { type: 'hr'; bpm: [number, number] }
  | { type: 'hrZone'; zone: 1 | 2 | 3 | 4 | 5 }
  | { type: 'power'; watts: [number, number] }
  | { type: 'powerZone'; zone: number }
  | { type: 'cadence'; spm: [number, number] };
```

Reglas de validación:

- `steps` no vacío. `repeat` no anidado (Garmin lo soporta, nosotros no, hasta que haga falta).
- Rangos siempre `[min, max]` con `min <= max`, salvo `pace` donde el primer valor es el ritmo **más rápido**. El traductor normaliza y el preview lo muestra en formato humano para que el error se vea antes de escribir.
- `target` incompatible con el deporte → error explícito (ej. `pace` en `strength`).
- `strength` solo soporta pasos por tiempo o repeticiones sin catálogo de ejercicios. El catálogo de ejercicios de Garmin queda fuera de alcance (ver roadmap).

---

## Ejemplo

Foto del entrenador: *"Calentar 15', 5x1000 a 4:10-4:20 con 2' trote suave, soltar 10'"*

```json
{
  "name": "5x1000 - martes",
  "sport": "running",
  "notes": "Calentar 15', 5x1000 a 4:10-4:20 con 2' trote suave, soltar 10'",
  "steps": [
    { "kind": "warmup", "duration": { "type": "time", "seconds": 900 } },
    {
      "kind": "repeat",
      "times": 5,
      "steps": [
        {
          "kind": "work",
          "duration": { "type": "distance", "meters": 1000 },
          "target": { "type": "pace", "minPerKm": [4.1667, 4.3333] }
        },
        { "kind": "recovery", "duration": { "type": "time", "seconds": 120 }, "note": "trote suave" }
      ]
    },
    { "kind": "cooldown", "duration": { "type": "time", "seconds": 600 } }
  ]
}
```

El `preview` que ve el usuario en el chat debe ser esto, no el JSON:

```
5x1000 - martes  ·  Carrera  ·  ~48 min / ~10.5 km
  Calentamiento   15:00
  5 × ┌ 1000 m    a 4:10–4:20 /km
      └ 2:00      recuperación (trote suave)
  Vuelta a la calma  10:00
```

---

## Traducción a Garmin

Forma real del payload, **confirmada (2026-08-14)** por GET a `/workout-service/workout/{id}` contra un workout propio existente (ver `garmin-api.md`):

```
workout
├─ workoutName, sportType { sportTypeId, sportTypeKey }
└─ workoutSegments[]
   └─ segmentOrder, sportType, workoutSteps[]
      ├─ ExecutableStepDTO: stepOrder, stepType{id,key},
      │  endCondition{id,key}, endConditionValue, endConditionCompare,
      │  targetType{id,key}, targetValueOne, targetValueTwo
      └─ RepeatGroupDTO: numberOfIterations, smartRepeat, workoutSteps[],
         endCondition{conditionTypeId:7, key:"iterations"}, endConditionValue=numberOfIterations
```

La forma hipotetizada antes de P0 era correcta en la estructura. Lo único nuevo confirmado: `endConditionCompare` (`"gt"` en el dump visto) y que el `RepeatGroupDTO` repite su propio `endCondition` de tipo `iterations` con el mismo valor que `numberOfIterations`.

Unidades, **confirmado**: distancia en **metros** (`endConditionValue: 2000.0` = 2km), pace como **velocidad en m/s** (`targetValueOne: 3.1746032` ≈ 3:09/km, el primer valor es el más rápido). La conversión y su redondeo son una fuente clásica de bugs → test dedicado.

### Constantes

**No se inventan.** Se extraen de dumps reales por GET. Van a vivir en `packages/core/src/workout/garmin-constants.ts` (P1), cada una con un comentario indicando de qué dump salió.

| Grupo | Estado | Origen |
|---|---|---|
| `sportTypeId`: `running`=1 | confirmado (2026-08-14) | workout real `1610864009` |
| `stepTypeId`: `warmup`=1, `interval`=3, `recovery`=4, `repeat`=6 | confirmado (2026-08-14) | workout real `1610864009` |
| `stepTypeId`: `cooldown`, `rest` | por confirmar | no aparecieron en el dump visto |
| `conditionTypeId`: `time`=2, `distance`=3, `iterations`=7 | confirmado (2026-08-14) | workout real `1610864009` |
| `conditionTypeId`: `lap.button`, `calories`, `hr` | por confirmar | no aparecieron en el dump visto |
| `workoutTargetTypeId`: `no.target`=1, `pace.zone`=6 | confirmado (2026-08-14) | workout real `1610864009` |
| `workoutTargetTypeId`: `heart.rate.zone`, `power.zone`, `cadence` | por confirmar | no aparecieron en el dump visto |

Faltan `cooldown`, `rest`, `lap.button`, `calories`, `hr`, y los targets de FC/potencia/cadencia. Se confirman de a poco, sobre la marcha, no con un workout "maestro" armado de una — cuando el DSL necesite ese tipo de paso, ahí se confirma esa constante puntual (`/garmin-endpoint`).

**Confirmado también en escritura (2026-08-14)**: `sportTypeId=1`, `stepTypeId` warmup=1/interval=3, `conditionTypeId` time=2/distance=3, `workoutTargetTypeId` no.target=1/pace.zone=6 — mismo workout de referencia usado para leer (`1610864009`) y para escribir (`POST` propio, `workoutId 1664286235`, "PAIR spike test"). Confirma que el traductor puede ser simétrico: las mismas constantes sirven para leer y para escribir.

Detalle de dos campos que en la lectura aparecían con valor y en la escritura quedaron `null` sin que Garmin los completara solo: `preferredEndConditionUnit` y `endConditionCompare`. No hicieron falta para que el workout se creara y mostrara bien en la app — parecen puramente informativos para el cliente (unidad preferida a mostrar, comparación del end condition), no campos que el traductor necesite emitir. Si algo se ve raro visualmente en la app más adelante, revisar esto primero.

Tabla de constantes completa leída por código (no probada aún, fuente: `python-garminconnect/workout.py`, comentario propio "from /workout-service/workout/types" — ese endpoint de catálogo no lo pegamos todavía nosotros):

| Enum | Valores |
|---|---|
| `sportTypeId` | running=1 ✅, cycling=2, other=3, swimming=4, strength_training=5, cardio_training=6, yoga=7, pilates=8, hiit=9, multi_sport=10, mobility=11 |
| `stepTypeId` | warmup=1 ✅, cooldown=2, interval=3 ✅, recovery=4 ✅, rest=5, repeat=6 ✅, other=7, main=8 |
| `conditionTypeId` | lap_button=1, time=2 ✅, distance=3 ✅, calories=4, power=5, heart_rate=6, iterations=7 ✅, fixed_rest=8, fixed_repetition=9, reps=10 |
| `workoutTargetTypeId` | no_target=1 ✅, power_zone=2, cadence=3, heart_rate_zone=4, speed_zone=5, pace_zone=6 ✅, grade=7, heart_rate_lap=8, power_lap=9, resistance=15 |

✅ = confirmado por nosotros contra cuenta real. El resto son **por confirmar**, no se usan hasta pegarle a `/workout-service/workout/types` o verlos en un dump propio.

---

## Cobertura

| Capacidad | Estado |
|---|---|
| Pasos por tiempo / distancia | **confirmado** (lectura y escritura, 2026-08-14) |
| Repeticiones | confirmado en lectura; escritura pendiente |
| Objetivo de ritmo (pace) | **confirmado** (lectura y escritura, 2026-08-14) |
| Objetivo de FC / potencia / cadencia | pendiente |
| Lap button | pendiente |
| Agendar en fecha | **confirmado** (2026-08-14) |
| Push a dispositivo | **confirmado** (2026-08-14, encola con `messageStatus: "new"`; entrega final depende del sync BLE/WiFi del teléfono, no de la API) |
| Round-trip Garmin → DSL | pendiente (traductor real en TS, P1) |
| Natación (largos, piscina) | fuera de alcance P3 |
| Fuerza con catálogo de ejercicios | fuera de alcance |

Actualizar esta tabla en cada cambio del traductor.
