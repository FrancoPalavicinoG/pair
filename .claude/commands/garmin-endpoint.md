---
description: Investigar y documentar un endpoint no oficial de Garmin
argument-hint: [qué dato o acción necesito]
allowed-tools: Read, Glob, Grep, Edit, WebFetch, WebSearch
---

Objetivo: $ARGUMENTS

1. Busca primero en `docs/garmin-api.md`. Si ya está documentado y confirmado, úsalo y termina.
2. Si no, busca en el código de `cyberjunky/python-garminconnect` y `matin/garth` cómo lo resuelven. Cita el archivo y la función.
3. Deriva la forma del request: método, path bajo `connectapi.garmin.com`, query params, headers, forma del body.
4. **No inventes IDs numéricos ni claves de enum.** Si un payload de Garmin usa constantes (sportTypeId, stepTypeId, endConditionId), la única fuente válida es un dump real: propón el GET que lo obtiene y márcalo como *por confirmar* hasta que lo ejecutemos.
5. Escribe la entrada en `docs/garmin-api.md` con estado `confirmado` o `por confirmar`, fecha, y la fuente.

No ejecutes llamadas reales a Garmin desde aquí. Solo investigación y documentación.
