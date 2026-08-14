# packages/core

Corazón en TypeScript. Puro: sin acceso a DB, sin `process.env`, sin side effects. Las dependencias (fetch, reloj, logger, store de tokens) entran por parámetro para que todo sea testeable sin red.

## Contenido

```
src/garmin/client.ts    Cliente REST con bearer, refresh transparente, reintentos
src/garmin/limiter.ts   Rate limiter + backoff. Punto único de salida hacia Garmin
src/garmin/schemas.ts   Zod de las respuestas de Garmin (parcial y tolerante)
src/workout/dsl.ts      PairWorkout: el schema Zod que produce Claude
src/workout/translate.ts DSL → JSON de workout de Garmin
src/errors.ts           Errores tipados con código y causa
src/log.ts              Logger con redacción obligatoria de secretos
```

## Reglas

- **Toda** llamada a Garmin sale de `client.ts`, que pasa por `limiter.ts`. Un `fetch` a `connectapi.garmin.com` en cualquier otro archivo es un bug.
- Los schemas de Garmin son tolerantes: `.passthrough()` y campos opcionales. Garmin añade y quita campos sin avisar; el parser no debe caerse por un campo nuevo. Lo que sí es estricto es nuestro DSL.
- Ninguna constante numérica de Garmin (`sportTypeId`, `stepTypeId`, `endConditionId`, `targetTypeId`) se escribe de memoria. Viven en `translate.ts` con un comentario que cita el dump real de `docs/garmin-api.md` del que salieron.
- Cada función de traducción y de parseo necesita test con fixture real anonimizado en `test/fixtures/`.
- `packages/core` no sabe qué es un usuario de PAIR ni una sesión MCP. Recibe tokens, devuelve datos.

## Al añadir soporte para un tipo de paso o target nuevo

1. Confirma las constantes con un dump real (`/garmin-endpoint`).
2. Extiende el DSL en `dsl.ts`.
3. Extiende `translate.ts` + fixture + test.
4. Actualiza la tabla de cobertura de `docs/workout-dsl.md`.
