# Spec: Catálogo de datos diarios de Garmin (bienestar, entreno, reportes históricos)

Roadmap: P4 (Dashboard personalizable), nuevo ítem ("Catálogo de datos diarios de Garmin")
Estado: draft

## Objetivo

Investigar, lo más ampliamente posible, qué datos de bienestar y rendimiento expone Garmin Connect más allá de los cuatro que ya guardamos (`restingHeartRate`, `steps`, `sleepSeconds`, `bodyBattery`) — sleep score y fases de sueño, HRV, estado de entreno, readiness, VO2 max, umbral de lactato, carga de entreno, estado de salud, foco de carga, puntuación de resistencia, peso/IMC, aclimatación (calor/altitud), estrés, edad física, y las métricas de reportes históricos (calorías, distancias, frecuencias cardíacas, FTP). Primero se sabe qué se puede traer; recién con eso confirmado, `app-dashboard-widgets-v2` decide qué entra como widget seleccionable. Este spec es investigación + storage, no UI — cuantos más datos reales queden confirmados y guardados, más grande el catálogo del que el usuario elige en su dashboard.

Salida observable: `docs/garmin-api.md` documenta, con estado `confirmado` y fixture anonimizada, cada endpoint investigado de la lista de abajo (aunque la respuesta sea "no existe" o "no disponible en esta cuenta"); lo que se confirme queda persistido en la sync diaria existente (`syncDailyMetrics`) sin romper lo que ya funciona.

## Alcance

**Entra**: revisar el `raw` que ya guardamos (payload completo de `usersummary-service`) por campos sin usar; investigar con el skill `/garmin-endpoint` (contra la cuenta real), en tandas para no golpear a Garmin de una sola vez, cada ítem del catálogo de abajo; diseño de storage para lo confirmado.

**No entra** (diferido, no es una omisión):
- Cualquier UI que consuma estos datos, incluida la decisión de cuáles se implementan como widget: eso es `app-dashboard-widgets-v2` Fase B, spec aparte — primero se sabe qué existe, después se elige qué construir.
- El diseño de la vista de detalle de cada widget: spec futuro aparte, ya acordado.
- Backfill histórico más allá de lo que ya trae `syncDailyMetrics` (30 días en la primera sync, confirmado en P1): si Garmin permite pedir historial más atrás para alguno de estos datos, se evalúa una vez confirmado el endpoint, no se asume ahora.
- Zonas de potencia/HR *por actividad* (distinto de las métricas diarias/agregadas de este spec): eso vive en el detalle de actividad.
- Categorías completas por disciplina que Garmin reporta (natación, entreno de fuerza, yoga, meditación, trabajo de respiración, deportes de invierno): quedan fuera de este pase, PAIR es una plataforma de running/ciclismo por ahora — se anota que existen, no se investigan.

## Catálogo a investigar (relevado explorando Garmin Connect web, panel "De un vistazo" + "Informes")

Recorrida manual de la cuenta real (vía la UI de Garmin Connect, no vía API) para saber qué existe antes de investigar por endpoint. Nada de esto está confirmado todavía — es la lista de qué buscar, no un reemplazo de la investigación real con el skill `/garmin-endpoint`. Ninguna fila de acá pasa a `docs/garmin-api.md` sin pasar primero por esa investigación real.

**Bienestar diario / rendimiento** (un valor por día o por ventana corta, mismo patrón que `daily_metrics`):
- Sleep score + desglose de fases (profundo/ligero/REM/despierto)
- Estado de VFC (HRV)
- Estado de entreno
- Predisposición para entrenar (readiness)
- VO2 máximo (carrera y ciclismo son valores separados)
- Umbral de lactato (FC / ritmo / potencia / potencia relativa)
- Carga de entreno (agudo/crónico + proporción) — **ver nota abajo, probable solape con el ítem de roadmap "métricas derivadas propias"**
- Estado de salud general (resumen tipo semáforo)
- Foco de carga (equilibrio entre tipos de esfuerzo)
- Puntuación de resistencia
- Peso + IMC (si el usuario lo carga en Garmin)
- Aclimatación al calor
- Aclimatación a la altitud
- Estrés (con desglose horario)
- Edad física
- Puntuación de pendiente/desafío (nombre exacto sin confirmar, tile cortada en la captura de referencia)

**Reportes históricos** (series largas, no solo el día): calorías de actividad, calorías restantes, distancia total, tiempo total de actividad, ritmo medio, velocidad media, frecuencia cardíaca máxima/media, estrés de variabilidad de FC, **FTP (potencia de umbral funcional)** con su tabla de clasificación de 5 niveles por color — esta tabla ya sirvió de referencia real para la rampa de zonas de potencia de `dashboard-visualization-system.md`.

**Nota, no investigación** — semanal por deporte: Garmin Connect ya arma una tarjeta por deporte (ej. "Ciclismo · Ago 21-27") con distancia, tiempo, barras diarias y tendencia de 4 semanas. No necesita endpoint nuevo (sale de actividades que ya sincronizamos) — confirma que separar "This week" por deporte en `app-dashboard-widgets-v2` es el patrón correcto, no una idea sin precedente. Se menciona acá por contexto, la implementación real vive en ese otro spec.

**Nota sobre carga de entreno / ACWR**: el roadmap ya tiene un ítem futuro de P4 ("Métricas derivadas propias: carga, ratio agudo/crónico, adherencia al plan") asumiendo que lo calculamos nosotros. La tile "Carga de entreno" de Garmin Connect ya muestra "872/770, proporción 1.1" — si al investigar confirmamos que Garmin expone ese cálculo hecho, ese ítem de roadmap podría simplificarse a "traer el número de Garmin" en vez de derivarlo nosotros. Se decide cuando se investigue ese endpoint, no ahora.

## Diseño

- **Primer paso, sin pegarle a Garmin**: leer el `raw` (JSONB) de filas reales ya guardadas en `daily_metrics` — el endpoint `usersummary-service/usersummary/daily` puede ya traer algún campo del catálogo que hoy ignoramos. Más barato que investigar un endpoint nuevo si el dato ya está ahí.
- **Investigación real vía skill `/garmin-endpoint`, en tandas** (no las ~15 de una sola sesión — Garmin banea por volumen, regla dura del proyecto). Orden sugerido: primero lo que `docs/garmin-api.md` ya marca "por confirmar" (HRV, body battery, stress), después sleep score/fases y estado de entreno/readiness (los que ya tienen consumidor claro en `app-dashboard-widgets-v2`), después el resto del catálogo de bienestar diario, por último los reportes históricos (son series largas, más caras de traer y menos urgentes).
- **Cada hallazgo se documenta en el mismo cambio que lo confirma** (regla dura del proyecto, `CLAUDE.md` raíz #6): endpoint, forma del payload, fixture anonimizada en `docs/fixtures/`. Si un endpoint no existe o la cuenta de prueba no tiene el dato (ej. sin reloj compatible con HRV status), se documenta igual como "confirmado: no disponible en esta cuenta" — no se deja para adivinar después.
- **Storage se decide con el dato real en la mano, no antes**: un score o valor puntual (sleep score, HRV, readiness, VO2 max, peso, estrés, etc.) es una columna más en `daily_metrics`, mismo patrón que las cuatro actuales. Las fases de sueño son una serie de segmentos dentro de una noche — no encajan en una columna escalar, probablemente tabla propia o JSONB estructurado, se decide viendo el payload real. Los reportes históricos (series largas por rango) probablemente no viven en `daily_metrics` sino que se piden a demanda contra Garmin cuando se muestren — se decide con el endpoint real confirmado, no antes.
- **`syncDailyMetrics` (`packages/sync/src/garmin-sync-service.ts`) extiende su mapeo, no se reescribe**: mismo bucle día a día que ya existe, se agregan los campos nuevos a `upsertDailyMetrics` a medida que se confirman. Los reportes históricos, si no encajan en la sync diaria, quedan fuera de `syncDailyMetrics` — otro indicio de que probablemente son "a demanda", no "guardado por día".

## Checklist de implementación

**Batch 1 — hecho (2026-08-27):**
- [x] Revisar `raw` de filas reales existentes por campos del catálogo sin usar — pagó: stress, body battery detallado, SpO2 y respiración ya venían en el resumen diario que ya sincronizamos, sin endpoint nuevo (`docs/garmin-api.md`, commit `1d54fc2`)
- [x] Storage para lo confirmado gratis: 3 columnas nuevas (`stress_average`, `spo2_average`, `respiration_avg`) en `packages/db/src/schema/daily-metrics.ts` — conservador a propósito, un valor resumen por área, el detalle rico (eventos de body battery, stress por franja) se queda en `raw` hasta que un widget concreto lo pida
- [x] `syncDailyMetrics` extendido con el mapeo de esos 3 campos
- [x] Probado end-to-end: `pnpm sync --user f@example.com` contra la cuenta real, `stress_average: 29`, `spo2_average: 94`, `respiration_avg: 15` del día de hoy, sin romper los 4 campos que ya andaban

**Batch 2a — forma derivada de código fuente, hecho (2026-08-27):** `garth` está instalado en `services/garmin-auth/.venv` y tiene módulos tipados para casi todo el catálogo — se leyó el código fuente (no se llamó a Garmin) y se documentó en `docs/garmin-api.md` como "por confirmar (derivado de código)":
- [x] HRV — `GET /hrv-service/hrv/{fecha}`
- [x] Sleep score + fases — dos candidatos (`sleep-service` y `wellness-service`), documentados ambos
- [x] Estado de entreno + ACWR — `GET /mobile-gateway/usersummary/trainingstatus/latest/{fecha}` (posible solape con "métricas derivadas propias" del roadmap, anotado)
- [x] Predisposición para entrenar (readiness) — `GET /metrics-service/metrics/trainingreadiness/{fecha}`
- [x] VO2 max, puntuación de resistencia, hill score ("puntuación de pendiente") — `hillscore` + `endurancescore`
- [x] Peso/IMC — `GET /weight-service/weight/dayview/{fecha}`
- [x] Aclimatación calor/altitud — **sin cobertura en `garth`**, ni confirmado ni descartado, queda anotado
- [ ] Umbral de lactato, salud general (semáforo), foco de carga, edad física — no encontrados en `garth` todavía, falta revisar más a fondo o `python-garminconnect`
- [ ] Bloque "reportes históricos" (calorías, distancias, frecuencias cardíacas, FTP) — no investigado en esta pasada

**Batch 2b — pendiente, necesita llamadas reales contra la cuenta (siguiente paso):**
- [ ] Verificar cada endpoint de arriba contra la cuenta conectada, un dump por vez, en tandas — confirmar path real, valores exactos de los campos tipo enum (`status` de HRV, `trainingStatus` numérico, `level` de readiness), y guardar fixture anonimizada de cada uno
- [ ] Storage + sync para lo que quede confirmado

## Preguntas abiertas

Cuáles de estos datos existen de verdad en la cuenta de prueba (varios dependen del modelo de reloj: HRV status, sleep score y VO2 max no están disponibles en todos los Garmin) — se responde investigando, no se asume acá.
