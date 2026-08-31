# Estilo visual

Fuente de verdad para el diseño visual de `apps/web`: paleta, tipografía, voz, componentes, sistema de color de gráficos y motion. Es autocontenido — no depende de ningún archivo externo para tener sentido. Antes de construir un componente nuevo para la web, leer la sección relevante acá. Si hace falta un patrón visual que este documento no cubre, no improvisarlo dentro del componente: agregarlo primero acá, o preguntar si hay alternativas razonables.

## Paleta

Nota (2026-08-16): esta paleta es light-only por decisión deliberada. Dark mode queda diferido a una iteración aparte — no hay tokens dark todavía, no instalar theme switching hasta que se diseñe explícitamente.

```css
--lcd:      #D7DCD2  /* fondo base de la web: la pantalla del reloj, gris-verde */
--lcd-deep: #C7CEC2  /* tarjetas y paneles claros, inset sobre --lcd */
--bone:     #EFF1EB  /* texto e íconos sobre superficie oscura */
--ink:      #161A16  /* todo el texto sobre superficie clara */
--graphite: #5C6459  /* texto secundario, metadata, líneas neutras */
--ember:    #FF4A17  /* el agente. nunca decorativo — ver regla abajo */
--panel:    #14161A  /* superficie oscura: inputs, gráficos, tiles en hover/flagged */
--panel-muted: #8B958A  /* texto secundario sobre --panel: label/sparkline de una tile en hover, comentarios de terminal */
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

### Ember: el acento de interacción

Hasta 2026-08-16 esta sección decía "ember es exclusivo de pair": solo aparecía en una recomendación o un cambio que pair había hecho, y estaba prohibido en cualquier affordance de interacción (botón, foco, selección). Esa regla queda reemplazada por esta (2026-08-17).

Ember es el acento de lo interactivo y accionable: botón primario, ítem activo o seleccionado (tab, opción de menú, toggle marcado), foco de teclado. No hace falta que pair haya actuado para usarlo: es el color por defecto de "esto se puede accionar", no la firma exclusiva del agente.

Lo que sigue sin tocar: ember no es color de dato ni de estado del sistema. La rampa ordinal, los hues de identidad de gráfico y la paleta de status (`--status-ready`, `--status-attn`) siguen siendo las únicas fuentes de color ahí: mezclar ember rompe la separación bajo daltonismo simulado ya validada (ver Gráficos). Dentro de un gráfico o una stat tile, una marca en ember sigue significando específicamente "esto es lo que pair señala": ya no es la única razón por la que ember aparece en pantalla, pero sigue siendo la única razón por la que aparece ahí.

Sin la regla de exclusividad, el límite pasa a ser de cantidad, no de contexto: ember en cada acción primaria y cada estado activo está bien; ember como fondo de superficie completo, ícono decorativo o color de texto de cuerpo no. Sigue siendo acento, no color base.

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

## Layout de escritorio

`apps/web` es una app que vive en el escritorio, no un sitio responsive pensado primero para el teléfono. Ninguna pantalla autenticada se resuelve como una columna angosta centrada en medio de un viewport ancho — eso es el layout por defecto de un formulario mobile, no el de una app nativa.

**Shell** (`Dashboard`, `Connect Garmin`, `Widgets` y cualquier superficie autenticada nueva):

- Sidebar izquierdo fijo, ancho ~248px, fondo `--lcd` con `border-right: 1px solid var(--rule-soft)`. De arriba a abajo: wordmark, nav vertical, logout al final (`margin-top: auto`).
- Cada ítem de nav es texto body (no mono), con el marcador `›` a la izquierda igual que el patrón de "lista tipo menú" de Inputs; el ítem activo pasa el marcador a `--ember` — mismo lenguaje que ya usa el resto del sistema para "esto está seleccionado", no un tratamiento nuevo.
- Contenido a la derecha: sin límite de ancho tipo tarjeta (nada de `max-width: 24rem` centrado). Usa el mismo `max-width` que el resto de la marca (1080–1200px) con padding lateral, dejando que la grilla respire en pantallas grandes en vez de forzar una columna.
- Dentro del contenido, cualquier fila de datos relacionados (stat tiles, widgets del dashboard) va en grid real (`grid-template-columns`), no apilada en una sola columna con `space-y-*`. Una lista vertical de tarjetas de ancho completo es el layout por defecto a evitar.

**Pantallas de auth** (`/login`, `/signup`, MFA): quedan como card centrada — es el patrón correcto para una ventana de login de app nativa (piénsese en el login de una app de Mac), no un error a corregir. Lleva wordmark arriba de la card y un ancho algo más generoso que una columna mobile (`~28rem`, no `24rem`).

## Componentes

### Inputs

Viven sobre `--panel` (superficie oscura), nunca directo sobre `--lcd`. Monoespaciados, con `$` como glyph de prefijo a la izquierda.

- **Texto / contraseña**: fondo `--panel`, texto `--bone`, borde 1px sutil que pasa a ember en foco (`:focus-within`). El cursor parpadea **solo** cuando el input está vacío y sin foco — es señal de "en espera", no de carga; desaparece apenas hay texto o foco real.
- **Código MFA**: 6 casillas cuadradas separadas, mono, centradas, mismo tratamiento de foco (borde ember) que el resto.
- **Select**: mismo fondo oscuro, sin flecha nativa del navegador — chevron propio en mono (`›` rotado 90°), borde a ember en foco.
- **Lista tipo menú** (ej. selector de conector): opciones con un marcador `›` a la izquierda; en la opción activa el marcador pasa a ember, y el fondo de esa fila puede pasar a `--panel` para reforzar la selección: evaluar caso a caso, no es obligatorio en cada lista.
- **Fila simple** (ej. una actividad reciente, un toggle de widget): borde `--rule-soft`, hover a borde `--ink`. Implementación de referencia: `apps/web/src/components/list-row.tsx` (`ListRow`).
- **Toggle**: checkbox real oculto + label con `[ ]` / `[×]` en mono; el bracket pasa a ember cuando está marcado.
- **Autocompletado fantasma**: texto ya escrito en `--ink`, sugerencia en `--graphite` a ~55% opacidad, con un hint `tab` en una cápsula chica de borde sutil.

### Botones

Implementación de referencia: `apps/web/src/components/pair-button.tsx` (`PairButton`, variantes `primary`/`outline`/`confirm`). Ningún botón de `apps/web` define su estilo a mano — usa `PairButton`.

- **Outline** (acción secundaria, ej. "Edit"): borde 1px `--ink` o `--rule`, fondo transparente, texto `--ink` o `--graphite`.
- **Primary**: relleno ember, texto `--bone`. Es la acción principal de la vista (login, signup, conectar Garmin, submit de un form) y se habilita apenas la acción es válida de tomar.
- **Confirm** (escritura a Garmin): mismo look que Primary, con un gate extra. Regla dura del proyecto (`CLAUDE.md` raíz, regla 4): toda escritura a Garmin pasa por preview → confirm, así que este botón **solo** se habilita una vez que hay un preview generado. Antes de eso está inerte: borde `--rule-soft`, texto grafito apagado, `cursor: not-allowed`, no clickeable.
- Nunca colapsar el flujo de escritura a Garmin a un solo botón, y nunca saltarse el gate de preview en Confirm: ese gate es del flujo de escritura, no una restricción de color.

### Foco / interacción — nunca el color nativo del sistema

Todo elemento clickeable define su propio `:focus-visible` explícito (`outline: 2px solid var(--ember)`) y resetea el outline nativo del navegador (`outline: none` en el estado base). Nunca dejar el foco nativo sin resetear: en macOS/Safari hereda el color de acento del sistema del usuario, y si ese acento no es ember el foco se ve inconsistente con el resto del sistema de interacción.

### Dashboard / stat tiles

Anatomía: label (mono, mayúscula chica, graphite) → valor (Archivo `wght 800`, grande, `--ink`) → delta (mono chico, signo + comparación, graphite) → sparkline (línea fina de 1.5px al 70% de opacidad + un marcador cuadrado al final, ver Gráficos).

**Contenedor**: cualquier fila de stat tiles es un `display:grid` con `gap: 1px` sobre fondo `--rule-soft` — el gap de 1px hace de divisor entre tiles sin agregar un `border` por tile. Es el reemplazo estándar de una caja individual con `border` cuando hay más de una métrica relacionada en la misma vista; una sola caja suelta con borde propio es el patrón a evitar ahí.

**Forma**: `aspect-ratio: 1` (cuadrada) es el default para un widget de una sola métrica — no una tile más ancha que alta. `StatTile` expone esto como prop opcional (`square`), sin encenderla en ningún consumidor todavía: ni la grilla de 4 columnas de Today (cada celda queda de ~107px de lado ahí, insuficiente para label + valor + delta + sparkline sin amontonarse) ni el widget suelto de "This week" (ocupa el ancho libre de media card, ~430px — cuadrarlo así da un cuadrado gigante y descuadra la fila entera del dashboard, comprobado en la práctica). Encenderla en un consumidor real, con el layout interno que haga falta para que el contenido quepa, es trabajo de `app-dashboard-widgets-v2`, cuando cada widget tenga su propia celda de tamaño fijo pensada para eso. Excepción aparte: widgets de lista (ej. actividad más reciente, cuando el contenido es texto de largo variable) no están obligados a ser cuadrados.

- Monocromas por defecto (línea graphite sobre fondo transparente que hereda el de la tile) — los hues vívidos del sistema de gráficos no se duplican acá. Extenderlos a las tiles fue una decisión que se probó y se revirtió por dos motivos: rompía la separación validada bajo daltonismo simulado (ver techo de hues en Gráficos), y diluía el significado de "un color por gráfico".
- El delta de una tile solo pasa a `--ember` cuando esa métrica es la que pair está comentando activamente — como mucho una tile así por vista. Esa tile además pasa toda su superficie a `--panel` (label, valor y fondo incluidos) para que se lea como "la que tiene algo que decir".
- **Hover**: la tile completa —fondo, label, valor y el área de la curva, todo junto, sin una franja con fondo propio— pasa a `--panel` con transición de 250ms. Es preview de interacción, nunca recolorea el delta a ember: hover es affordance de UI, no una señal de que pair hizo algo.
- **Cierre (`×`)**: botón en la esquina superior derecha, oculto (`opacity: 0`) hasta hover o foco del contenedor (`:focus-within`), color `--graphite` → `--ink` en su propio hover. Nunca ember: no es la acción primaria de la vista, y reservar ember para esa evita que compita visualmente con lo que sí importa. Es el patrón que usa el dashboard configurable (P4) para sacar un widget de la vista.
- **Drag handle**: glyph mono `⋮⋮` a la izquierda de la tile, color `--graphite`. `cursor: grab` en reposo, `grabbing` mientras se arrastra. Mismo tratamiento de foco que cualquier elemento interactivo (`:focus-visible` con outline ember). Usado por el dashboard configurable (P4) para reordenar widgets.

### Gráficos

Este documento no dice qué graficar — eso lo decide cada feature. Lo que fija son las **opciones de tipo de marca y color** disponibles para cuando haya que graficar algo, y la regla de color que las atraviesa a todas.

**Tipos de marca disponibles:**

- **Barra apilada horizontal**: para una magnitud repartida en categorías con un orden (ej. una distribución en niveles/tramos). Segmentos con un gap de 2px del color de la superficie entre cada uno (nunca un borde), sobre `--panel`. Leyenda con swatch cuadrado + label debajo. Color: rampa ordinal.
- **Barras verticales**: para una magnitud a lo largo del tiempo, una barra por período. Grosor máximo 24px, esquina superior redondeada 4px / base recta, altura crece desde una sola línea base, gap de 2px entre barras. Color: un hue de identidad. Como mucho una barra puede llevar `--ember` con una nota corta arriba, cuando esa barra marca algo que pair hizo.
- **Línea de tendencia**: para una serie continua en el tiempo. Línea de 2px, relleno de área opcional con el mismo hue de identidad al ~10–14% de opacidad, marcador cuadrado en cada punto. Como mucho un punto puede ser ember, con una leader-line y un label corto de una línea, cuando ese punto es el que pair señaló.
- **Heatmap de grilla**: para densidad o frecuencia repetida (ej. una vista tipo calendario). Celdas cuadradas, color por celda según la rampa ordinal. Como mucho una celda puede ser ember si marca algo que pair hizo.
- **Chip de estado**: punto de color (8px, círculo) + label de texto siempre junto — nunca color solo. Usa la paleta de status, nunca los hues de identidad ni ember.
- **Gauge circular**: arco de progreso (`<svg>`, dos `<circle>` — pista + progreso vía `stroke-dasharray`/`stroke-dashoffset`), valor grande al centro (spec Display, `wght 800`/`wdth 90`, mismo tratamiento que el valor de una stat tile), label mono chico debajo. Para un solo número con techo conocido (0–100, o un rango fijo): sleep score, readiness, body battery. Color: graphite por defecto (monocromo, mismo criterio que las stat tiles) salvo que la métrica ya tenga su propia escala de zona — cuál va en cada caso se decide widget por widget, no acá.
- **Barra de fases de sueño**: timeline horizontal segmentado, mismo principio que "barra apilada horizontal" (gap de 2px entre segmentos, del color de superficie de la tile — fondo claro por defecto, invierte a `--panel` en hover como cualquier otra tile, no una superficie oscura fija) pero **categórico por fase, no ordinal por magnitud** — el ancho de cada segmento es proporción de tiempo, no una escala de "cuánto". Color: rampa `--sleep1`…`--sleep4` (ver Sistema de color), en orden despierto → ligero → REM → profundo.
- **Mini-barras diarias**: una barra corta por día (7 días, sin ejes), para una magnitud donde cada día ya es una unidad comparable por sí sola (ej. horas de entrenamiento, minutos en zona) — no una tendencia continua. Mismo hue de identidad que el resto del gráfico. Regla para elegir entre esto y el sparkline (`apps/web/src/lib/sparkline.ts`): si la métrica no tiene "unidad de día" fuerte (ej. resting HR, que es un valor que fluctúa) usa sparkline; si cada día es su propia unidad de conteo (ej. horas entrenadas ese día) usa mini-barras.

En todos los casos: como mucho **una** marca ember por gráfico, y solo cuando hay algo que pair efectivamente hizo — si no hay nada que señalar, el gráfico no lleva ember.

**Sistema de color — tres roles fijos, más ember afuera de los tres:**

- **Ordinal / magnitud** → rampa "effort" naranja de 5 pasos (`--z1`…`--z5`), un solo hue, monótona en luminosidad, validada sobre `--panel`. Para cualquier "cuánto" ordenado: barra apilada, heatmap. **Esta es también la rampa de zonas de HR** — no hay una escala de color separada para frecuencia cardíaca, es la misma rampa de esfuerzo.
- **Ordinal / zonas de potencia** (ciclismo) → rampa propia de 5 pasos, `--pw1`…`--pw5`, magenta/rosa, un solo hue distinto del de HR (potencia y ritmo cardíaco son magnitudes distintas — mezclar el mismo hue para ambas en una vista que muestre las dos, ej. detalle de una actividad de bici, rompería "un hue, una escala"). Validada (`scripts/validate_palette.js --ordinal`): `#F5A9D0, #ED7CB3, #E54E93, #CC2E72, #992050`. Nota para cuando se implemente el widget: la clasificación de FTP de Garmin (fitness vs. otros ciclistas) y las zonas de entrenamiento por %FTP (durante un pedaleo) son cosas distintas — cuál de las dos necesita esta rampa se confirma ahí, no acá.
- **Identidad de gráfico** → un hue vívido por gráfico, tomado de la lista de hues ya validados (`--chart-a` teal, `--chart-b` violeta) — nunca reusado en dos gráficos visibles a la vez en la misma vista, así cada uno se reconoce por color sin necesidad de leer el título. Techo real: no más de 3–4 hues vívidos conviviendo en la misma vista — un 5º empieza a chocar con alguno de los anteriores o con ember bajo daltonismo simulado (confirmado al intentar sumar un hue más, de nuevo confirmado al validar la rampa de fases de sueño: no quedaba espacio para un hue nuevo). Si hacen falta más de los dos ya validados, generar el candidato y validarlo (ver script abajo) antes de asumir que hay espacio.
- **Categórico / fases de sueño** → rampa propia de 4 pasos, `--sleep1`…`--sleep4`, **misma familia de hue que `--chart-a`** (no un hue nuevo — ya no quedaba espacio bajo el techo de arriba). Es seguro porque la barra de fases de sueño y un gráfico coloreado con `--chart-a` no conviven nunca en la misma vista (uno es el widget de sueño, el otro es un gráfico de tendencia en otro contexto) — si esto cambia alguna vez, revisar de nuevo. Validada como rampa ordinal: `#A8E6E0, #5FC9BE, #1FA79C, #0D6E66`, orden despierto (más claro) → ligero → REM → profundo (más oscuro).
- **Estado (status)** → paleta fija y reservada (`--status-ready` verde, `--status-attn` azul), nunca reusada como identidad de gráfico ni mezclada con los hues de arriba. **Nota (2026-08-31)**: corriendo el validador real contra la paleta ya shippeada, `--status-ready` y `--chart-a` fallan la separación bajo daltonismo simulado entre sí (ΔE 8.5, debajo del piso de 15) — hallazgo preexistente, no introducido acá, sin arreglar todavía porque no es lo que este spec pidió resolver.
- **Ember** → fuera de las escalas de arriba. Aparece como mucho una vez por gráfico, exclusivamente donde pair actuó.

No a ojo: cualquier color de gráfico nuevo (un hue de identidad extra, un ajuste a la rampa) se valida primero con el skill `dataviz` antes de escribirlo en código:

```
node scripts/validate_palette.js "<hex,hex,…>" --mode dark --surface "#14161A"
```

Para una rampa ordinal, agregar `--ordinal`. El script falla si la separación bajo daltonismo simulado no alcanza, si el contraste contra la superficie es insuficiente, o si la luminosidad no es monótona — corregir el color hasta que pase, no forzar el commit con un fallo.

**Marcas**: siempre píxel cuadrado, nunca círculo u óvalo — referencia directa a la textura de pantalla LCD. Línea de 2px (1.5px en el sparkline de stat tile, comprimido dentro de una tile chica — mismo criterio, grosor ajustado al tamaño), marcador ≥8px de lado. Ver gotcha técnico abajo sobre cómo posicionar el marcador sin deformarlo.

## Motion

Todo dispara una vez —carga, scroll, foco, hover o click— y para ahí. Nada en loop, nada parpadeando de forma automática, tampoco el ember ni ningún dato marcado (se probó con pulso automático en las marcas ember y se sacó: competía con la idea de "quieto salvo que pase algo"). La única excepción "viva" es el cursor de los inputs tipo comando, que parpadea mientras espera. Duraciones típicas: 250ms para cambios de superficie (hover), 500–700ms para entradas (fade + rise al hacer scroll, conteo de números, trazo de una línea). Respetar siempre `prefers-reduced-motion`: todo colapsa a su estado final sin transición, nada se comunica solo por movimiento.

## Gotchas técnicos

Cosas que costó descubrir al construir estos componentes — no repetirlas:

- **`preserveAspectRatio="none"` deforma las marcas.** Un `<svg>` con ese atributo estira su contenido de forma no uniforme para llenar el contenedor (necesario para que una línea de tendencia ocupe el ancho completo de una tarjeta responsive). Un `<circle>` o `<rect>` cuadrado dibujado *adentro* de ese `viewBox` se deforma en óvalo o rectángulo según el ancho real de la tarjeta en pantalla. Solución: la línea se queda en el SVG (estirarse no le hace nada), pero cualquier marcador puntual (punto de sparkline, de línea de tendencia) va como elemento HTML posicionado por `%` **encima** del SVG, con tamaño fijo en px — nunca como shape dentro del viewBox estirado.
- **Un `<button>` sin `outline` propio hereda el foco nativo del navegador.** En macOS/Safari ese foco puede tomar el color de acento del sistema del usuario — si está en naranja, se confunde con ember al hacer click aunque el CSS nunca haya pedido ember. Definir siempre `:focus-visible` explícito (ver Foco / interacción arriba) en vez de confiar en el default del navegador.
- **`outline-none` + `focus-visible:outline-2` en Tailwind v4 no pinta nada.** `outline-2`/`outline-{color}` fijan ancho y color pero delegan el estilo a la variable compartida `--tw-outline-style`; `outline-none` fija esa misma variable a `none` **de forma permanente en el elemento**, así que un `focus-visible:outline-2` posterior sigue leyendo `none` y el anillo nunca se ve (se probó con foco real por teclado + estilos computados, no a ojo — un `getComputedStyle` apurado sin forzar reflow después de un `Tab` sintético también puede devolver el valor viejo y hacer parecer que el bug sigue). Fix: `focus-visible:[--tw-outline-style:solid]` en vez de (o además de) `focus-visible:outline`, para sobreescribir la variable específicamente en el estado con foco.
