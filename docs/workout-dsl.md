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

Forma aproximada del payload (**por confirmar en P0**):

```
workout
├─ workoutName, sportType { sportTypeId, sportTypeKey }
└─ workoutSegments[]
   └─ segmentOrder, sportType, workoutSteps[]
      ├─ ExecutableStepDTO: stepOrder, stepType{id,key},
      │  endCondition{id,key}, endConditionValue,
      │  targetType{id,key}, targetValueOne, targetValueTwo
      └─ RepeatGroupDTO: numberOfIterations, smartRepeat, workoutSteps[]
```

Unidades: Garmin trabaja en **metros**, **segundos** y **m/s**. El ritmo va como velocidad, no como min/km. La conversión y su redondeo son una fuente clásica de bugs → test dedicado.

### Constantes

**No se inventan.** Todas las constantes numéricas se extraen de un workout real creado a mano en Garmin Connect y recuperado por GET (tarea de P0). Viven en un único archivo, `packages/core/src/workout/garmin-constants.ts`, cada una con un comentario indicando de qué dump salió.

| Grupo | Estado | Origen |
|---|---|---|
| `sportTypeId` | por confirmar | dump P0 |
| `stepTypeId` (warmup, cooldown, interval, recovery, rest, repeat) | por confirmar | dump P0 |
| `conditionTypeId` (lap.button, time, distance, calories, hr) | por confirmar | dump P0 |
| `workoutTargetTypeId` (no.target, pace.zone, heart.rate.zone, power.zone, cadence) | por confirmar | dump P0 |

Estrategia de verificación: crear en la app de Garmin un workout que use **cada** tipo de paso, condición y objetivo que queremos soportar, y hacer un solo GET. Un dump bien elegido confirma la tabla entera.

---

## Cobertura

| Capacidad | Estado |
|---|---|
| Pasos por tiempo / distancia | pendiente |
| Repeticiones | pendiente |
| Objetivo de ritmo / FC / potencia | pendiente |
| Lap button | pendiente |
| Round-trip Garmin → DSL | pendiente |
| Natación (largos, piscina) | fuera de alcance P3 |
| Fuerza con catálogo de ejercicios | fuera de alcance |

Actualizar esta tabla en cada cambio del traductor.
