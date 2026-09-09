# Spec: Tools de insight (`get_training_load`, `get_recovery_trend`)

Roadmap: P3 (MCP y conectores), ítem "Tools de 'insight' que traducen los datos crudos... en algo que Claude pueda razonar"
Estado: hecho

## Objetivo

Que Claude pueda responder "¿cómo vengo entrenando?" y "¿cómo estoy de recuperación?" sin tener que juntar y comparar a mano varios días de `get_daily_metrics`. Estas tools calculan la comparación (esta semana vs la anterior, tendencia de una métrica en una ventana de días) — nunca la interpretación ("deberías descansar"). Esa parte sigue siendo trabajo de Claude, no de PAIR: mismo principio que ya le explica `get_started` ("vos decidís, PAIR traduce").

Salida observable: con un token que tenga `activities:read`/`metrics:read`, Claude puede pedir la carga de entrenamiento semanal por deporte y la tendencia de recuperación de los últimos N días, ambas con números reales comparados, no solo el dato de hoy.

## Alcance

**Entra**: `get_training_load` (volumen/duración por deporte, esta semana vs la anterior), `get_recovery_trend` (HRV, FC en reposo, sueño, readiness, ACWR — tendencia sobre una ventana de días).

**No entra** (diferido, no es una omisión):
- Dog factor: el roadmap lo menciona en este mismo ítem, pero es P5, que no arrancó — no hay dato que leer todavía.
- Cualquier recomendación o decisión ("bajá la carga", "descansá"): es trabajo de Claude razonando sobre estos datos, nunca de una tool. Una tool que devolviera eso estaría tomando la decisión que el proyecto explícitamente reserva para Claude.
- `trainingStatusPhrase`, VO2 max, hill/endurance score: son indicadores de escala más lenta (semanas/meses), no cambian día a día — no encajan en una tool de "tendencia reciente". Ya están disponibles hoy vía `get_daily_metrics` para quien los necesite puntualmente.

## Diseño

### `get_training_load` — envuelve `findWeeklySummary`, ya existe

`packages/db/src/repositories/activities.ts` ya tiene `findWeeklySummary(userId)`: duración total y por-deporte (distancia, cantidad de actividades) de esta semana vs la semana pasada. Hoy solo la usan los widgets `weekly-distance.tsx`/`weekly-hours.tsx` del dashboard. La tool solo formatea esa misma función para texto — cero lógica nueva de agregación.

Salida: una línea por deporte con actividad en cualquiera de las dos semanas — distancia y/o duración (según tenga sentido para ese deporte, mismo criterio de `getSpeedDisplay`) más el cambio porcentual vs la semana pasada. "Primera semana con datos" cuando no hay semana anterior para comparar (ya resuelto así en los widgets, se reusa el mismo texto).

Sin input — siempre esta semana vs la anterior, no hace falta parametrizar un rango acá.

### `get_recovery_trend` — tendencia sobre una ventana, cálculo nuevo pero simple

Input: `days` (default 7, máximo 30 — mismo tope que `get_daily_metrics`, mismo repository de base: `findRecentDailyMetrics`).

Un solo algoritmo de tendencia, igual para las 5 métricas (sin casos especiales por métrica, a diferencia del ejemplo ilustrativo que se discutió con el usuario — más simple y más fácil de confiar):

1. Tomar los valores no nulos de la métrica en la ventana, en orden cronológico.
2. Si hay menos de 2 valores, no reportar tendencia para esa métrica ("sin datos suficientes"), no inventar una con un solo punto.
3. Comparar el primer valor con el último: dirección (sube/baja/estable — un umbral chico, a definir al implementar, evita marcar "tendencia" por ruido de ±1 unidad) y cambio porcentual.
4. Reportar también el valor más reciente en crudo (con su unidad), no solo el delta — Claude necesita el número absoluto además de la tendencia.

Métricas: `restingHeartRate` (bpm), `hrvLastNightAvg` (ms), `sleepScore`, `readinessScore`, `acwr`. Cada una con su propia línea; una métrica sin datos suficientes en la ventana se omite de la salida, no se fuerza a aparecer vacía.

### Reuso potencial (nota, no bloqueante)

`weekly-distance.tsx` y `weekly-hours.tsx` ya calculan un delta porcentual esta-semana-vs-anterior a mano, cada uno por su lado — con el cálculo de tendencia nuevo de `get_recovery_trend`, va a haber tres lugares calculando porcentajes de cambio de forma parecida. Si al implementar se ve que es realmente el mismo cálculo, vale la pena sacar una función compartida a `packages/core` (mismo criterio de "segundo uso => se comparte" del resto del proyecto) — se decide al escribir el código, no antes.

## Checklist de implementación

- [x] `apps/mcp/src/tools/get-training-load.ts`
- [x] `apps/mcp/src/tools/get-recovery-trend.ts` (`computeTrend` local al archivo — sin segundo uso real todavía, la nota de reuso de arriba queda pendiente para cuando aparezca)
- [x] Registrar las 2 en `apps/mcp/src/mcp-session.ts`
- [x] Actualizar la tabla de tools de `apps/mcp/CLAUDE.md`
- [x] Probado a mano contra la cuenta real: `get_training_load` y `get_recovery_trend` con datos reales (dos cuentas distintas, una con huecos de datos reales y otra con serie completa), casos subiendo/bajando/estable, y el rechazo por scope faltante
- [x] Probado con Claude Desktop real: "¿cómo viene mi carga de entrenamiento?" y "¿cómo está mi tendencia de recuperación?" contra la cuenta real. Claude usó las dos tools, reportó los números correctos, y razonó sobre ellos (fatiga acumulada, sugerencia de días fáciles, cuándo consultar a alguien) sin que PAIR le diera ninguna de esas conclusiones — exactamente el límite que separa a estas tools de una tool de "decisión".
- [x] Marcar el spec como `hecho`, tildar el ítem de `docs/roadmap.md`

## Actualización (2026-09-09): bug de legibilidad encontrado en la prueba con datos reales

Probando contra una cuenta real con series completas, `get_training_load` mostraba líneas como `"Resort Skiing: 0 m, 0 actividades (−100% vs semana pasada)"` para un deporte que se dejó de hacer esta semana — técnicamente correcto (`thisWeek: 0`, `lastWeek: > 0`), pero confuso de leer. Se corrigió `formatSportLine` para decir directo "sin actividad esta semana (la semana pasada: X)" en ese caso, en vez de forzar el mismo formato de "distancia + % de cambio" cuando uno de los dos números es cero. `get_recovery_trend` no tuvo este problema: verificado con datos reales los tres casos (subiendo, bajando, estable).

## Preguntas abiertas

Ninguna — el umbral de "estable" (3% FC/HRV, 5% sueño/readiness/ACWR) se probó contra datos reales y se comportó como se esperaba, no hizo falta ajustarlo.
