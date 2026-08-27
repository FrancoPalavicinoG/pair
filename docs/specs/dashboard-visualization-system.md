# Spec: Sistema de visualización v2 (gauges, fases de sueño, zonas de potencia)

Roadmap: P4 (Dashboard personalizable), nuevo ítem ("Sistema de visualización v2")
Estado: draft

## Objetivo

Que los gráficos del dashboard tengan más vida y densidad de información sin tocar el branding base (paleta de superficie, tipografía, botones) — eso ya está bien logrado y se mantiene. Agrega a `docs/style.md` los tipos de marca y sistemas de color que hacen falta para los widgets nuevos de `app-dashboard-widgets-v2`: un gauge circular, una barra de fases de sueño, y un sistema de color de zonas de potencia (ciclismo) separado del de HR.

Salida observable: `docs/style.md` (sección Gráficos) documenta los tipos nuevos con el mismo nivel de detalle que los existentes (barra apilada, línea de tendencia, heatmap); cada color nuevo pasa `scripts/validate_palette.js` antes de quedar escrito.

## Alcance

**Entra**: tipo de marca "gauge circular" (progreso en arco, valor grande al centro — sleep score / readiness / body battery); tipo de marca "barra de fases" (timeline segmentado por tipo de fase de sueño, inspirado en la referencia que pasaste); sistema de color de zonas de potencia; formalizar "tile cuadrada, simétrica" como estándar de forma para widgets de una sola métrica; decidir cuándo un widget usa sparkline (línea fina, tendencia continua) vs. mini-barras diarias (una barra por día, mejor para comparar día a día).

**No entra** (diferido, no es una omisión):
- Implementar los widgets que usan estos gráficos: eso es `app-dashboard-widgets-v2`, este spec solo define el sistema.
- Rediseñar la paleta de superficie (`--lcd`, `--ink`, `--ember`, etc.) o la tipografía: confirmaste que eso está bien, no se toca.
- Zonas de potencia *por actividad* (ej. mostrar en qué zona estuvo cada segundo de un pedaleo): esto es sobre el widget diario agregado, no el detalle de una actividad — ese es otro alcance si llega a pedirse.

## Diseño

- **Las HR zones ya tienen sistema de color**: la rampa "effort" (`--z1`…`--z5`) que `docs/style.md` ya define es, de hecho, el sistema de zonas de heart rate — `pair-brand-ui.html` ya la usa así en el ejemplo "Heart rate zones · this week". No se reinventa: se documenta explícitamente esa relación en `docs/style.md` para que quede claro sin tener que inferirlo del ejemplo.
- **Zonas de potencia necesitan una rampa propia**, no reusar la de HR: son una magnitud distinta (potencia, no ritmo cardíaco) y mezclar el mismo hue para ambas en una vista que muestre las dos (ej. detalle de una actividad de bici) rompería la regla ya validada de "un hue, una escala". Referencia real encontrada explorando Garmin Connect (`garmin-daily-metrics.md`, catálogo): la clasificación de FTP que Garmin ya muestra usa **5 niveles** (Principiante/Aceptable/Bueno/Excelente/Superior — no 7 como asumía antes de mirar la cuenta real), con un color por nivel (rojo/naranja/verde/azul/violeta en su UI, sin validar contra nuestra paleta). Ojo: esa tabla es una *clasificación de fitness* (dónde estás vs. otros ciclistas), distinta de las *zonas de entrenamiento por %FTP* que se usan durante un pedaleo — confirmar cuál de las dos (o ambas) hace falta cuando se implemente, no se asume acá. Se valida como rampa ordinal nueva vía skill `dataviz` + `scripts/validate_palette.js --ordinal`, separada de la rampa de esfuerzo — el valor exacto de cada paso se define implementando el spec, no acá.
- **Gauge circular**: arco de progreso (`<svg>`, `stroke-dasharray` sobre un `<circle>`), valor grande al centro (mismo spec Display de tipografía que ya usan las stat tiles), label mono abajo. Color del arco: el hue de identidad del gráfico si es una métrica sin zonas propias (ej. readiness), o el color de la zona actual si la métrica ya tiene su propia escala (ej. body battery podría usar la rampa de esfuerzo si se mapea 0–100 a esos 5 pasos — se decide con el dato real de `garmin-daily-metrics` en la mano).
- **Barra de fases de sueño**: timeline horizontal segmentado (mismo principio que "barra apilada horizontal" ya documentado — gap de 2px entre segmentos, sobre `--panel`), pero categórico por tipo de fase (despierto/ligero/profundo/REM), no ordinal por magnitud. La referencia que pasaste usa un solo hue con variación de intensidad por fase en vez de 4 hues distintos — se explora esa dirección primero (menos hues nuevos, más coherente con el techo ya validado de 3-4 hues vívidos) antes de asumir que hacen falta 4 colores separados.
- **Sparkline vs. mini-barras diarias**: el sparkline fino (ya construido, `apps/web/src/lib/sparkline.ts`) se queda para tendencias continuas de un valor que no tiene "unidad de día" fuerte (ej. resting HR). Para métricas donde cada día es una unidad comparable de por sí (ej. horas de entrenamiento, minutos en zona), se agrega el tipo "mini-barras" (una barra corta por día, 7 días, sin ejes) — mismo principio que la referencia de trends que pasaste, adaptado a la paleta del proyecto (nunca color nativo de sistema, siempre un hue ya validado).
- **Tile cuadrada**: se fija como estándar la proporción 1:1 para cualquier widget de una sola métrica (hoy las stat tiles son más anchas que altas). Los widgets de lista (actividad más reciente, cuando tenga texto variable) quedan exceptuados — cuadrado es el default para dato numérico, no una regla sin excepción.

## Checklist de implementación

- [ ] `docs/style.md`: documentar la relación rampa de esfuerzo ↔ HR zones explícitamente
- [ ] Validar y documentar la rampa de zonas de potencia (`scripts/validate_palette.js --ordinal`)
- [ ] `docs/style.md`: tipo de marca "gauge circular"
- [ ] `docs/style.md`: tipo de marca "barra de fases de sueño" + su sistema de color (explorar 1 hue con intensidad variable antes que 4 hues)
- [ ] `docs/style.md`: tipo de marca "mini-barras diarias" y regla de cuándo usar sparkline vs. mini-barras
- [ ] `docs/style.md`: "tile cuadrada" como estándar de forma, con la excepción de widgets de lista
- [ ] Componentes base reutilizables para gauge y barra de fases (`apps/web/src/components/` o junto a `StatTile`, se decide con `ui-component-library` ya en pie)

## Preguntas abiertas

Color exacto del gauge cuando la métrica no tiene una escala de zonas propia (¿hue de identidad fijo, o el mismo ember reservado para "esto es lo que pair señala"?) — se responde con el primer caso de uso real (`app-dashboard-widgets-v2` Fase B), no en abstracto.
