# Estilo visual

Fuente de verdad para el diseño visual de `apps/web`: paleta, tipografía, voz, componentes, sistema de color de gráficos y motion. Es autocontenido — no depende de ningún archivo externo para tener sentido. Antes de construir un componente nuevo para la web, leer la sección relevante acá. Si hace falta un patrón visual que este documento no cubre, no improvisarlo dentro del componente: agregarlo primero acá, o preguntar si hay alternativas razonables.

## Paleta

```css
--lcd:      #D7DCD2  /* fondo base de la web: la pantalla del reloj, gris-verde */
--lcd-deep: #C7CEC2  /* tarjetas y paneles claros, inset sobre --lcd */
--bone:     #EFF1EB  /* texto e íconos sobre superficie oscura */
--ink:      #161A16  /* todo el texto sobre superficie clara */
--graphite: #5C6459  /* texto secundario, metadata, líneas neutras */
--ember:    #FF4A17  /* el agente. nunca decorativo — ver regla abajo */
--panel:    #14161A  /* superficie oscura: inputs, gráficos, tiles en hover/flagged */
--rule:      rgba(22,26,22,.18)  /* bordes y divisores sobre superficie clara */
--rule-soft: rgba(22,26,22,.10)  /* divisores muy sutiles, fondos de grid de 1px */
```

Sistema de color de gráficos — detalle de uso en la sección Gráficos:

```css
--z1:#F2C79A  --z2:#ECA25E  --z3:#E67E3A  --z4:#D45A28  --z5:#B33A1C  /* rampa "effort", ordinal */
--chart-a: #1FA79C  /* hue de identidad disponible — teal */
--chart-b: #9B5DE5  /* hue de identidad disponible — violeta */
--status-ready: #3F9A5C  /* verde, estado "listo" */
--status-attn:  #3E6FD1  /* azul, estado "monitorear" */
```

### La regla dura: ember es exclusivo de pair

Ember solo aparece donde **pair actuó**: una recomendación, un cambio que hizo, una razón que da. Nunca es:

- color de dato (una zona de FC, una barra, "la semana actual"),
- estado del sistema (ready / monitor / error),
- foco de teclado, hover, o cualquier affordance de interacción del usuario.

Si ember está en pantalla y pair no hizo nada, es un bug de diseño, no un acento. Esta es la regla que ordena todo lo demás en este documento — cuando una decisión nueva no esté clara, esta es la que decide.

## Tipografía

Archivo (variable, ejes `wdth`/`wght`) para todo texto de producto. JetBrains Mono para cualquier cosa que produjo la máquina: métricas, timestamps, comandos, labels.

| Uso | Spec | Notas |
|---|---|---|
| Display | Archivo · `wght 800` · `wdth 90` | Titulares y hero figures. Sentence case, nunca signos de exclamación. |
| Body | Archivo · `wght 400` · `wdth 100` | 16–17px, leading generoso (~1.55–1.6). Sentence case también en botones. |
| Utility | JetBrains Mono · 400/500, `letter-spacing` ligero | Datos, labels en mayúscula con tracking (`10–11px`, `letter-spacing: .1em`), timestamps, comandos, valores de stat tiles. |

**Wordmark**: `p` + `AI` + `r`, minúscula salvo el `AI`, que va en ember. Tracking `-0.045em`, espacio de resguardo igual a la altura de la `p`. Reglas duras:

- Nunca todo mayúscula (`PAIR`) — mata el chiste del AI escondido adentro.
- Nunca "AI" repetido (`pAIr AI`).
- Solo el `AI` cambia de color; nada más en la marca toma ember.
- Sin descriptores pegados (`Pair™ Fitness`, `pAIr — running coach`).
- En texto corrido y en código siempre `pair`, minúscula.

**Marcador de sección (eyebrow)**: label chico en mono, mayúscula, `letter-spacing: .2em`, precedido por dos círculos superpuestos de 6px — uno `--ink`, uno `--ember` — a modo de bullet. Es el motivo estructural que abre cada sección nueva de contenido.

## Voz

Coach apps gritan, un partner de entrenamiento observa. Tres reglas:

1. **Observar, no celebrar.** Decir qué pasó y qué significa; la celebración es del corredor, no del software.
   - No: *"¡Reventaste la carrera hoy! 🔥 Nuevo récord personal!"*
   - Sí: *"5k más rápido desde marzo. Doce segundos."*
2. **Siempre decir por qué.** Toda recomendación lleva su razón en la misma frase — un plan que no se puede cuestionar es un plan que no se sigue.
   - No: *"Se recomienda descanso según tus métricas."*
   - Sí: *"HRV bajo hace 4 días seguidos. Mañana es suave."*
3. **Corto y ya.** Dos frases como techo en cualquier pantalla que se mira a mitad de carrera; el detalle vive un tap más adentro.

Sin signos de exclamación, sin emojis, sentence case siempre — incluidos botones y titulares.

## Textura de pantalla

Una grilla sutil de 1px (`repeating-linear-gradient` horizontal + vertical, `rgba(22,26,22,.03)`) cubre toda la superficie, fija respecto al viewport (`position: fixed`, `z-index` alto, `pointer-events: none`). Referencia al memory-in-pixel display del reloj — es parte de la identidad, no decoración de una sola página: se replica en cualquier superficie nueva del producto.

## Componentes

### Inputs

Viven sobre `--panel` (superficie oscura), nunca directo sobre `--lcd`. Monoespaciados, con `$` como glyph de prefijo a la izquierda.

- **Texto / contraseña**: fondo `--panel`, texto `--bone`, borde 1px sutil que pasa a ember en foco (`:focus-within`). El cursor parpadea **solo** cuando el input está vacío y sin foco — es señal de "en espera", no de carga; desaparece apenas hay texto o foco real.
- **Código MFA**: 6 casillas cuadradas separadas, mono, centradas, mismo tratamiento de foco (borde ember) que el resto.
- **Select**: mismo fondo oscuro, sin flecha nativa del navegador — chevron propio en mono (`›` rotado 90°), borde a ember en foco.
- **Lista tipo menú** (ej. selector de conector): opciones con un marcador `›` a la izquierda; el marcador solo se pinta ember en la opción activa, el resto del texto queda en graphite/bone. Nunca colorear la fila completa.
- **Toggle**: checkbox real oculto + label con `[ ]` / `[×]` en mono; el bracket pasa a ember cuando está marcado.
- **Autocompletado fantasma**: texto ya escrito en `--ink`, sugerencia en `--graphite` a ~55% opacidad, con un hint `tab` en una cápsula chica de borde sutil.

### Botones — preview → confirm

Regla dura del proyecto (`CLAUDE.md` raíz, regla 4): toda escritura a Garmin pasa por preview → confirm.

- **Outline** (acción secundaria, ej. "Edit"): borde 1px `--ink` o `--rule`, fondo transparente, texto `--ink` o `--graphite`.
- **Confirm**: relleno ember, texto `--bone` — **solo** existe una vez que hay un preview generado. Antes de eso el botón está inerte: borde `--rule-soft`, texto grafito apagado, `cursor: not-allowed`, no clickeable.
- Nunca colapsar el flujo a un solo botón, y nunca poner ember en un botón que dispara la escritura directa sin preview previo.

### Foco / interacción — nunca el color nativo del sistema

Todo elemento clickeable define su propio `:focus-visible` explícito (`outline: 2px solid var(--ink)`, `var(--bone)` sobre superficie oscura) y resetea el outline nativo del navegador (`outline: none` en el estado base). Nunca dejar el foco nativo sin resetear: en macOS/Safari hereda el color de acento del sistema del usuario, y si ese acento está en naranja se confunde con ember al hacer click, rompiendo la regla de exclusividad de arriba. La única excepción deliberada es el borde ember en foco de los inputs tipo comando (sección Inputs) — ahí es identidad, no un descuido.

### Dashboard / stat tiles

Anatomía: label (mono, mayúscula chica, graphite) → valor (Archivo `wght 800`, grande, `--ink`) → delta (mono chico, signo + comparación, graphite) → sparkline (línea de 2px + un marcador cuadrado al final, ver Gráficos).

- Monocromas por defecto (línea graphite sobre fondo transparente que hereda el de la tile) — los hues vívidos del sistema de gráficos no se duplican acá. Extenderlos a las tiles fue una decisión que se probó y se revirtió por dos motivos: rompía la separación validada bajo daltonismo simulado (ver techo de hues en Gráficos), y diluía el significado de "un color por gráfico".
- El delta de una tile solo pasa a `--ember` cuando esa métrica es la que pair está comentando activamente — como mucho una tile así por vista. Esa tile además pasa toda su superficie a `--panel` (label, valor y fondo incluidos) para que se lea como "la que tiene algo que decir".
- **Hover**: la tile completa —fondo, label, valor y el área de la curva, todo junto, sin una franja con fondo propio— pasa a `--panel` con transición de 250ms. Es preview de interacción, nunca recolorea el delta a ember: hover es affordance de UI, no una señal de que pair hizo algo.
- **Cierre (`×`)**: botón en la esquina superior derecha, oculto (`opacity: 0`) hasta hover o foco del contenedor (`:focus-within`), color `--graphite` → `--ink` en su propio hover. Nunca ember — cerrar un widget es una acción del usuario, no del agente. Es el patrón que va a usar el dashboard configurable (P4) para sacar un widget de la vista.

### Gráficos

Este documento no dice qué graficar — eso lo decide cada feature. Lo que fija son las **opciones de tipo de marca y color** disponibles para cuando haya que graficar algo, y la regla de color que las atraviesa a todas.

**Tipos de marca disponibles:**

- **Barra apilada horizontal**: para una magnitud repartida en categorías con un orden (ej. una distribución en niveles/tramos). Segmentos con un gap de 2px del color de la superficie entre cada uno (nunca un borde), sobre `--panel`. Leyenda con swatch cuadrado + label debajo. Color: rampa ordinal.
- **Barras verticales**: para una magnitud a lo largo del tiempo, una barra por período. Grosor máximo 24px, esquina superior redondeada 4px / base recta, altura crece desde una sola línea base, gap de 2px entre barras. Color: un hue de identidad. Como mucho una barra puede llevar `--ember` con una nota corta arriba, cuando esa barra marca algo que pair hizo.
- **Línea de tendencia**: para una serie continua en el tiempo. Línea de 2px, relleno de área opcional con el mismo hue de identidad al ~10–14% de opacidad, marcador cuadrado en cada punto. Como mucho un punto puede ser ember, con una leader-line y un label corto de una línea, cuando ese punto es el que pair señaló.
- **Heatmap de grilla**: para densidad o frecuencia repetida (ej. una vista tipo calendario). Celdas cuadradas, color por celda según la rampa ordinal. Como mucho una celda puede ser ember si marca algo que pair hizo.
- **Chip de estado**: punto de color (8px, círculo) + label de texto siempre junto — nunca color solo. Usa la paleta de status, nunca los hues de identidad ni ember.

En todos los casos: como mucho **una** marca ember por gráfico, y solo cuando hay algo que pair efectivamente hizo — si no hay nada que señalar, el gráfico no lleva ember.

**Sistema de color — tres roles fijos, más ember afuera de los tres:**

- **Ordinal / magnitud** → rampa "effort" naranja de 5 pasos (`--z1`…`--z5`), un solo hue, monótona en luminosidad, validada sobre `--panel`. Para cualquier "cuánto" ordenado: barra apilada, heatmap.
- **Identidad de gráfico** → un hue vívido por gráfico, tomado de la lista de hues ya validados (`--chart-a` teal, `--chart-b` violeta) — nunca reusado en dos gráficos visibles a la vez en la misma vista, así cada uno se reconoce por color sin necesidad de leer el título. Techo real: no más de 3–4 hues vívidos conviviendo en la misma vista — un 5º empieza a chocar con alguno de los anteriores o con ember bajo daltonismo simulado (confirmado al intentar sumar un hue más). Si hacen falta más de los dos ya validados, generar el candidato y validarlo (ver script abajo) antes de asumir que hay espacio.
- **Estado (status)** → paleta fija y reservada (`--status-ready` verde, `--status-attn` azul), nunca reusada como identidad de gráfico ni mezclada con los hues de arriba.
- **Ember** → fuera de las tres escalas. Aparece como mucho una vez por gráfico, exclusivamente donde pair actuó.

No a ojo: cualquier color de gráfico nuevo (un hue de identidad extra, un ajuste a la rampa) se valida primero con el skill `dataviz` antes de escribirlo en código:

```
node scripts/validate_palette.js "<hex,hex,…>" --mode dark --surface "#14161A"
```

Para una rampa ordinal, agregar `--ordinal`. El script falla si la separación bajo daltonismo simulado no alcanza, si el contraste contra la superficie es insuficiente, o si la luminosidad no es monótona — corregir el color hasta que pase, no forzar el commit con un fallo.

**Marcas**: siempre píxel cuadrado, nunca círculo u óvalo — referencia directa a la textura de pantalla LCD. Línea de 2px, marcador ≥8px de lado. Ver gotcha técnico abajo sobre cómo posicionar el marcador sin deformarlo.

## Motion

Todo dispara una vez —carga, scroll, foco, hover o click— y para ahí. Nada en loop, nada parpadeando de forma automática, tampoco el ember ni ningún dato marcado (se probó con pulso automático en las marcas ember y se sacó: competía con la idea de "quieto salvo que pase algo"). La única excepción "viva" es el cursor de los inputs tipo comando, que parpadea mientras espera. Duraciones típicas: 250ms para cambios de superficie (hover), 500–700ms para entradas (fade + rise al hacer scroll, conteo de números, trazo de una línea). Respetar siempre `prefers-reduced-motion`: todo colapsa a su estado final sin transición, nada se comunica solo por movimiento.

## Gotchas técnicos

Cosas que costó descubrir al construir estos componentes — no repetirlas:

- **`preserveAspectRatio="none"` deforma las marcas.** Un `<svg>` con ese atributo estira su contenido de forma no uniforme para llenar el contenedor (necesario para que una línea de tendencia ocupe el ancho completo de una tarjeta responsive). Un `<circle>` o `<rect>` cuadrado dibujado *adentro* de ese `viewBox` se deforma en óvalo o rectángulo según el ancho real de la tarjeta en pantalla. Solución: la línea se queda en el SVG (estirarse no le hace nada), pero cualquier marcador puntual (punto de sparkline, de línea de tendencia) va como elemento HTML posicionado por `%` **encima** del SVG, con tamaño fijo en px — nunca como shape dentro del viewBox estirado.
- **Un `<button>` sin `outline` propio hereda el foco nativo del navegador.** En macOS/Safari ese foco puede tomar el color de acento del sistema del usuario — si está en naranja, se confunde con ember al hacer click aunque el CSS nunca haya pedido ember. Definir siempre `:focus-visible` explícito (ver Foco / interacción arriba) en vez de confiar en el default del navegador.
