# Spec: Widgets al estilo Garmin — gauges de zona, fases de sueño por profundidad, historial de VFC/estado

Roadmap: P4, extiende `docs/specs/dashboard-visualization-system.md` (gauges, fases de sueño) y `docs/specs/app-dashboard-widgets-v2.md` (Fase B, los widgets que esto toca)
Estado: draft

## Objetivo

Cinco widgets (Readiness, Training status, Sleep score, HRV, VO2 Max) pasan de "un número + un sparkline genérico" a la lectura visual que ya usa Garmin Connect: gauges con el arco coloreado por zona (no relleno monocromo), colores claramente diferenciados (no solo tonos), e historial reciente donde Garmin lo muestra. Salida observable: las tres capturas de referencia de esta conversación (`ref1.png`/`ref2.png`/`ref3.png`, guardadas en el scratchpad de esta sesión) dejan de ser una referencia externa y pasan a describir lo que el dashboard de PAIR muestra, adaptado a nuestra paleta.

**Nota de tensión con el roadmap**: P4 dice "el dashboard responde una pregunta que la app de Garmin no responde" (`docs/roadmap.md`). Esto no choca con ese objetivo — es la capa visual (gauges, color, densidad de información por widget) la que se acerca a Garmin, no el análisis; lo que pair agrega (comentario en ember, comparación entre widgets, MCP) sigue siendo la diferenciación real. Se anota para que quede explícito, no porque bloquee nada.

## Alcance

**Entra:**
- Sistema de color de zona nuevo (5 pasos, multi-hue) para gauges y chips de estado, sumado al sistema de color de `docs/style.md`.
- Gauge circular de zona (arco pre-coloreado + marcador de posición), nuevo tipo de marca en `docs/style.md`.
- Readiness: gauge de zona + desglose de 6 factores (sueño, sueño reciente, VFC, carga aguda, recuperación, estrés reciente).
- Training status: "desde [fecha]" + barra de historial de las últimas 4 semanas, un color por estado.
- Sleep score: la barra de fases pasa de altura uniforme a altura variable por profundidad (REM más alta, despertares como picos al máximo, profundo más bajo).
- HRV: mini-timeline de puntos coloreados de las últimas 4 semanas (balanceado/bajo/desequilibrado), además del valor y estado actuales que ya muestra.
- VO2 Max: gauge de zona igual que Readiness/Endurance score.

**No entra:**
- Endurance score no está en el pedido de esta sesión, pero como ya usa el mismo gauge de zona y ya tiene los límites de clasificación confirmados (`docs/garmin-api.md`), se deja preparado para sumarse con el mismo componente cuando se pida — no se construye el widget ahora.
- Cualquier hex final de la rampa de zona nueva: se proponen candidatos acá, pero ninguno se escribe en código sin pasar `scripts/validate_palette.js --ordinal` primero (regla dura de `docs/style.md`, Gráficos).
- Tabla de zonas de VO2 Max para mujeres, y selección automática por sexo/edad (`users` no guarda esos campos hoy) — la constante queda lista para extenderse, pero no se implementa la segunda tabla ni el campo de perfil en este cambio.
- Confirmar el espacio completo de valores de `level`/`*FactorFeedback` de readiness (hoy solo "MODERATE"/"GOOD" vistos) — no bloquea implementar (los cortes de zona ya están definidos por score numérico, no por esos textos), pero sí conviene confirmarlo antes de dar por seguro el texto exacto que puede aparecer en la grilla de 6 factores.

## Diseño

### Sistema de color: nueva rampa de zona (5 pasos, multi-hue)

`docs/style.md` hoy define rampas **ordinales de un solo hue** (`--z1`…`--z5` naranja, `--pw1`…`--pw5` magenta) porque la regla era "un hue, luminosidad monótona". Garmin usa una rampa ordinal de **cinco hues distintos** (rojo→naranja→verde→azul→violeta) para "qué tan buena es esta lectura" — es una familia de dato distinta a "esfuerzo" o "potencia", así que no reemplaza `--z1`…`--z5`, se suma como una tercera rampa ordinal con una regla de mezcla distinta (multi-hue en vez de monótona), a validar como tal.

Esto es exactamente lo que pediste ("no solo tonos distintos, sino colores claramente diferenciados") y por eso Garmin lo hace así: bajo daltonismo simulado, dos tonos del mismo hue se confunden fácil (por eso el resto de las rampas del proyecto son monótonas en luminosidad, no en hue) — para "esto está mal / esto está óptimo" conviene lo opuesto, que el hue cambie, no solo la luminosidad. El costo es que valida distinto: `validate_palette.js` mide separación de a pares, así que 5 hues en una rampa es una barra más exigente que un solo hue en 5 pasos de luz. Y el hallazgo ya documentado (`--status-ready`/`--chart-a` fallan la separación real) es una advertencia concreta, no teórica, de que esto puede fallar en la práctica.

Propuesta de 5 pasos (nombre de trabajo `--zone1`…`--zone5`, a confirmar en la sesión de implementación), ajustados a la saturación más baja que ya usa el resto de la paleta (`--z1`…`--z5`, `--sleep1`…`--sleep4` son pasteles, no primarios puros como los de Garmin):

```
--zone1: #C94A3E  /* rojo — bajo/pobre */
--zone2: #D98A3D  /* naranja — aceptable/moderado */
--zone3: #4C9A5C  /* verde — bueno/equilibrado */
--zone4: #3E7FD1  /* azul — muy bueno/alto */
--zone5: #7B5FD9  /* violeta — óptimo/excelente */
```

**Sin validar todavía** — antes de escribirlos en `globals.css` corren `node scripts/validate_palette.js "#C94A3E,#D98A3D,#4C9A5C,#3E7FD1,#7B5FD9" --mode dark --surface "#14161A" --ordinal`. Si falla, se ajustan (probablemente `--zone1`/`--zone2` primero, rojo-naranja es el par más común que colisiona) y se vuelve a correr — no se fuerza el commit con un fallo, regla ya escrita en `docs/style.md`.

**Regla que se mantiene sin excepción** (ya está en `docs/style.md`, "Chip de estado"): color nunca solo. Todo gauge/punto de zona lleva su label de texto al lado ("Óptimo", "Bajo", "Equilibrado") — las tres capturas de referencia ya lo hacen así, no es una regla nueva, es aplicarla acá también.

### Gauge circular de zona (componente nuevo)

`GaugeChart` (`apps/web/src/components/gauge-chart.tsx`) hoy es un progreso monocromo (pista gris + arco de relleno de un solo color, como un loader). Lo que muestran las tres capturas es otra cosa: **todo el arco está coloreado por zona a la vez** (los 5 colores conviven en el mismo arco, en orden fijo) y un **punto marcador** indica dónde cae el valor actual dentro de ese arco — no hay "relleno", hay una aguja sobre una escala fija.

Es un componente nuevo, no una prop más de `GaugeChart` (la mecánica de dibujo es distinta: `GaugeChart` anima un `stroke-dashoffset` sobre un solo `<circle>`; el gauge de zona necesita 5 arcos fijos, uno por zona, más un marcador posicionado por ángulo). Nombre de trabajo: `ZoneGaugeChart`. Props: `value`, `min`, `max`, `zoneBoundaries` (los 4 cortes entre las 5 zonas — específicos por métrica, ver cada widget abajo), `label` (el texto de zona, ej. "Óptimo"). Mismo criterio visual que `GaugeChart`: valor grande al centro (Display `wght 800`), label mono chico debajo, invierte a superficie oscura en hover igual que cualquier tile — y ahora también en modo página (`square={false}`, sin `group`/hover, mismo patrón que se armó esta sesión para `StatTile`/`TileShell`).

El arco no es un círculo completo — las tres capturas dejan un hueco abajo (~270° de arco, no 360°), igual que un velocímetro. Eso también es un cambio de mecánica de dibujo respecto al `GaugeChart` actual (círculo completo), no solo de color.

### Barra de fases de sueño con altura variable (cambio al componente existente)

`SleepPhaseBar` (`apps/web/src/components/sleep-phase-bar.tsx`) hoy es una barra de altura uniforme, ancho proporcional a la duración real de cada segmento — eso ya está bien y no cambia (`docs/style.md` ya lo pide así, "barra de fases de sueño... ancho real, sin gap"). Lo que pediste sumar es que la **altura** de cada segmento también cambie según la profundidad, como en la captura de referencia: REM más alto, ligero medio, profundo más bajo, y los despertares como picos finos que llegan al máximo.

Mapeo de alturas propuesto (relativo a la altura total de la barra, hoy fija en `h-8`):
- `awake` (despertar): 100% — pico fino, ancho real (casi siempre corto), llega al tope.
- `rem`: ~85%
- `light`: ~55%
- `deep`: ~30%

Estos porcentajes son una decisión de diseño nuestra (no vienen de Garmin, que no documenta su escala) — el objetivo es solo que se lean en el orden correcto (despertar > REM > ligero > profundo), no calzar un valor exacto. Se ajustan mirando datos reales en la sesión de implementación. Color: se mantiene `--sleep1`…`--sleep4` (ya validada, ya en el orden correcto) — este cambio es de geometría, no de paleta.

### Timeline de puntos coloreados (componente nuevo, para HRV)

Las mini-gráficas de "Estado de VFC · Últimas 4 semanas" en la referencia son una tercera mecánica: puntos (no barras, no línea continua) distribuidos en el tiempo, cada uno coloreado según el estado de VFC de ese día (verde=equilibrado, naranja=borde, rojo=desequilibrado), con una línea de tendencia fina de fondo. Componente nuevo, nombre de trabajo `HrvTimelineChart`. Reusa la rampa `--zone1`…`--zone5` de arriba (probablemente solo 3 de los 5 pasos aplican a VFC — bajo/equilibrado/desequilibrado — a confirmar contra el espacio real de valores de `hrvStatus`, ver Preguntas abiertas).

## Por widget

### Readiness (`readiness.tsx`)

**Comparación con la referencia**: `ref3.png` — gauge de zona con marcador + valor grande + label de nivel ("Bajo") + subtítulo corto, y debajo una grilla 2×3 de factores (label corto + sublabel gris).

**Datos**: ya confirmados y completos, **sin necesitar tocar Garmin de nuevo** — `docs/garmin-api.md` línea 70 ya documenta el desglose completo por factor (`sleepScoreFactorFeedback`, `sleepHistoryFactorFeedback`, `hrvFactorFeedback`, `acwrFactorFeedback`, `recoveryTimeFactorFeedback`, `stressHistoryFactorFeedback`), fixture real en `docs/fixtures/training-readiness.anon.json`. Hoy `daily_metrics` solo guarda `readinessScore`/`readinessLevel` (columnas) — los 6 factores viven en el payload crudo (`raw` JSONB) si `packages/sync` ya los persiste sin recortar, a confirmar en el checklist. Si hace falta, se agregan como columnas nuevas (mismo patrón que el resto de `daily_metrics`) vía migración — no se leen del JSONB a mano en el widget, `packages/db/CLAUDE.md` ya lo prohíbe para lo que el dashboard muestra.

**Cortes de zona (0–100), definidos por Franco** — el tope (`--zone5`, Óptimo) queda angosto (los últimos 10 puntos), el resto se reparte parejo entre las 4 zonas restantes:

```
--zone1 (rojo):    0–22
--zone2 (naranja): 22–45
--zone3 (verde):   45–67
--zone4 (azul):    67–90
--zone5 (violeta): 90–100
```

Son cortes nuestros (Garmin no los expone para Readiness) — coherente con `readinessLevel` de hoy: un score de 30 (fixture real de esta sesión) cae en `--zone2`, y la referencia mostraba "Bajo" para ese mismo 30 — calza con naranja/zona baja, no con rojo extremo.

**Cambios**:
- Gauge de zona (`ZoneGaugeChart`) en vez del `GaugeChart` monocromo actual — value=`readinessScore` (0–100), zonas según la tabla de arriba.
- A la derecha del gauge: `readinessLevel` grande (ej. "Bajo") + una frase corta — la referencia usa una frase tipo "Céntrate en tus niveles de energía"; no tenemos ese texto confirmado de Garmin (podría venir de `feedbackShort`/`feedbackLong`, ej. `LISTEN_TO_YOUR_BODY` — a decodificar o mostrar formateado con `formatLabel`, no traducir a mano).
- Grilla 2×3 debajo: cada factor como label corto (`*FactorFeedback` formateado) + sublabel gris (nombre del factor, texto fijo nuestro: "Sleep", "Recent sleep", "HRV status", "Acute load", "Recovery", "Recent stress").
- Sigue siendo `TileShell`, sigue recibiendo `square` (grilla vs. página) — el contenido interno cambia, el mecanismo de las dos vistas ya construido esta sesión no.

### Training status (`training-status.tsx`)

**Comparación**: `ref1.png`, primera tile — ícono + label de estado grande, "Desde [fecha]", y abajo una barra de chips de color, uno por estado de las últimas 4 semanas.

**Datos**: `trainingStatusPhrase` ya se guarda un valor por día en `daily_metrics` — "desde cuándo" y el historial de 4 semanas son **derivables de lo que ya sincronizamos**, sin Garmin nuevo: `findRecentDailyMetrics(userId, 28)` (ya existe) trae los últimos 28 días; "desde" es la fecha más vieja de la racha actual (escanear hacia atrás mientras el estado base no cambia — el sufijo de severidad, ej. "PRODUCTIVE_1" → "PRODUCTIVE_5", cambia día a día sin que el estado cambie, así que compararlo entero cortaba la racha en el primer paso). **Resuelta la pregunta de 4 vs. 7 chips**: ninguna de las dos — la barra corre los 28 días agrupando corridas consecutivas del mismo estado base y dibuja un segmento por corrida, con ancho proporcional a cuántos días duró y el corte exactamente en la fecha real de cambio (no baldes de calendario). El label junto al estado (ej. "Productive") también muestra el estado base, sin el sufijo de severidad.

**Espacio completo de estados, confirmado por Franco** (10 categorías) — colores redefinidos por Franco en la sesión de implementación (categórico, no una escala de "peor a mejor"):

| Estado | Color |
|---|---|
| Sobreentrenamiento (`OVERTRAINING`) | `--zone1` rojo |
| Sobrecarga (`STRAINED`) | `--status-strained` magenta (hue nuevo) |
| No productivo (`UNPRODUCTIVE`) | `--zone2` naranja |
| Pérdida de forma (`DETRAINING`) | gris |
| Recuperación (`RECOVERY`) | `--zone4` azul |
| Mantenimiento (`MAINTAINING`) | `--status-maintaining` amarillo/oliva — **no pasa el validador, aceptado por Franco a sabiendas** (mejor candidato real disponible, no existe un amarillo que libre el piso conviviendo con el naranja y el verde ya shippeados; detalle y números exactos en `docs/style.md`) |
| Productivo (`PRODUCTIVE`) | `--zone3` verde |
| Pico de forma (`PEAKING`) | `--zone5` violeta |
| Sin estado (`NO_STATUS`) | gris |
| En pausa (`PAUSED`) | gris |

`--status-strained` valida completo con `scripts/validate_palette.js --pairs all` contra `--lcd`/`--panel`; `--status-maintaining` no pasa (excepción aceptada, detalle y números exactos en `docs/style.md`, Gráficos).

**Cambios**:
- Debajo del label de estado: `"Desde " + formatDate(inicio de la racha)`.
- Divisor + barra de segmentos de ancho proporcional (uno por corrida de estado dentro de los últimos 28 días, `flex-grow` = días de esa corrida, gap de 2px entre segmentos) + label "Últimas 4 semanas".
- Color por segmento: la tabla de arriba.

### Sleep score (`sleep-phases.tsx`)

**Comparación**: `ref1.png`, segunda tile — ya implementado en estructura (número + duración + barra de fases + hora de inicio/fin), el cambio es la geometría de la barra (ver "Barra de fases de sueño con altura variable" arriba).

**Datos**: ya tenemos todo (`sleepStages`, `SleepStageSegment[]`, ya persistido). Sin cambios de datos.

**Cambios**: solo `sleep-phase-bar.tsx` — alturas por `stage` en vez de altura uniforme (`h-8` fijo pasa a un alto máximo con cada segmento a un % de ese máximo). Sin cambios de color ni de `sleep-phases.tsx` (el widget que lo consume).

### HRV (`hrv.tsx`)

**Comparación**: `ref1.png`, tercera tile — ícono + "Equilibrado" + valor grande "44 ms" + "Media de 7 días", una barra de rango de color con marcador, y abajo 3 mini-timelines de puntos ("Últimas 4 semanas").

**Datos**: `hrvStatus`/`hrvLastNightAvg`/`hrvWeeklyAvg` ya se guardan por día — el timeline de 4 semanas es `findRecentDailyMetrics(userId, 28)`, igual que training status. Sin Garmin nuevo.

**Decidido por Franco**: se muestran los dos valores, no uno solo — anoche (`hrvLastNightAvg`) y la media de 7 días (`hrvWeeklyAvg`), además del gráfico de distribución. Ya tenemos ambas columnas en `daily_metrics`, sin Garmin nuevo.

**Cambios**:
- Mantiene "Equilibrado" (`hrvStatus` formateado) + `hrvLastNightAvg` (valor de anoche) + `hrvWeeklyAvg` con su propio label ("Media de 7 días") — dos valores etiquetados, no uno solo reusando la etiqueta de la referencia.
- Suma la barra de rango de color (gauge lineal simple, no circular — franja horizontal con las zonas de `--zone1`…`--zone5` recortadas al rango de VFC, marcador vertical con la posición del valor actual).
- Suma el timeline de puntos (`HrvTimelineChart` de arriba) con los últimos 28 días.

### VO2 Max Running (`daily-metrics.tsx`, `renderVo2MaxRunning`)

**Comparación**: `ref1.png`, cuarta tile — mismo `ZoneGaugeChart` que Readiness, value=`vo2MaxRunning`, label de nivel ("Óptimo") debajo.

**Cortes de zona, dados por Franco (tabla pública de Garmin, VO2 max de carrera, hombres)**:

| Nivel | Zona | Rango (ml/kg/min) |
|---|---|---|
| De deficiente a muy deficiente | `--zone1` rojo | ≤ 41.7 |
| Aceptable | `--zone2` naranja | 41.7 – 45.4 |
| Bueno | `--zone3` verde | 45.4 – 51.1 |
| Excelente | `--zone4` azul | 51.1 – 55.4 |
| Superior | `--zone5` violeta | ≥ 55.4 |

No viene de `maxmet` (que solo trae `maxMetCategory` como id sin decodificar, `docs/garmin-api.md` línea 71) — es la tabla pública de Garmin que Franco confirmó a mano, así que no hace falta el `/garmin-endpoint` que este spec pedía originalmente. Rango visual del gauge (min/max del arco, no afecta los cortes): 25–65, para que "de deficiente a muy deficiente" y "superior" tengan algo de arco visible en vez de un extremo pegado al borde — número nuestro, ajustable mirando el gauge armado.

**Solo hombres por ahora, con extensión fácil marcada explícitamente** — `users` no guarda sexo/edad hoy (`packages/db/src/schema/users.ts`), así que no hay forma de elegir la tabla automáticamente por usuario todavía. La tabla se define como una constante nombrada y exportada (`VO2_MAX_RUNNING_ZONES_MALE` o similar) en vez de números sueltos adentro del componente — cuando haga falta la versión femenina (tabla distinta, a conseguir de la misma fuente pública), se agrega como una segunda constante y un selector por sexo, sin tocar el resto del widget. Agregar el campo de sexo al perfil de usuario para elegir automáticamente es trabajo aparte, no entra acá.

## Checklist de implementación

- [ ] `/garmin-endpoint`: confirmar si `daily_metrics.raw` ya tiene el desglose de 6 factores de readiness sin recortar, o si `packages/sync` los descarta al parsear — si hace falta, migración para columnas nuevas.
- [ ] Candidatos de color de la rampa de zona: correr `scripts/validate_palette.js --ordinal`, ajustar hasta pasar, documentar en `docs/style.md`.
- [ ] `ZoneGaugeChart` (componente nuevo, `apps/web/src/components/`).
- [ ] `HrvTimelineChart` (componente nuevo).
- [ ] `sleep-phase-bar.tsx`: alturas variables por stage.
- [ ] `readiness.tsx`: gauge de zona (cortes ya definidos) + grilla de 6 factores.
- [x] `training-status.tsx`: "desde" (racha por estado base, sin sufijo de severidad) + barra de segmentos proporcional por corrida real. Los 10 colores definidos, incluida la excepción aceptada de Mantenimiento.
- [ ] `hrv.tsx`: rango de color + timeline de 4 semanas + valor de 7 días además del de anoche.
- [ ] `daily-metrics.tsx` (`renderVo2MaxRunning`): gauge de zona (tabla de hombres ya definida, como constante extensible).
- [ ] `docs/style.md`: documentar la rampa de zona nueva, el tipo de marca "gauge de zona" y el tipo "timeline de puntos" en Gráficos, antes o en el mismo cambio que el primer componente que los use.

## Preguntas abiertas

Resuelto por Franco: cortes de Readiness, tabla de zonas de VO2 Max (hombres), espacio completo de estados de Training status, y qué mostrar en HRV (ambos valores). Queda abierto:

- Confirmar espacio completo de valores de `level`/`*FactorFeedback` de readiness y de `hrvStatus` (hoy "MODERATE"/"GOOD"/"UNBALANCED" son los únicos vistos) — no bloquea, pero conviene saberlo antes de asumir que el texto que aparezca siempre entra en el layout de la grilla de 6 factores.
- Nombres finales de los tokens de color (`--zone1`…`--zone5` es nombre de trabajo) y de los componentes nuevos (`ZoneGaugeChart`/`HrvTimelineChart`): a confirmar en plan mode de la sesión de implementación, no bloquean el spec.
- Training status: resuelto — barra de segmentos por corrida real (ver tabla de colores arriba), no chips de calendario. Color de Mantenimiento resuelto: amarillo/oliva aceptado como excepción al validador (no hay alternativa que pase, ver `docs/style.md`).
