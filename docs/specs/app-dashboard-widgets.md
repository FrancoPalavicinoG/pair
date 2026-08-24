# Spec: Dashboard configurable — widgets, layout persistente, drag-and-drop

Roadmap: P4 (Dashboard personalizable), primer ítem ("Widgets configurables y layout persistente")
Estado: draft

## Objetivo

Que el dashboard deje de ser un reflejo fijo de Garmin Connect y pase a tener secciones ("widgets") que el usuario puede reordenar, mostrar/ocultar, y que persisten entre sesiones — más una pieza de contenido nueva (resumen semanal) que hoy no existe en ningún lado. Primer ítem real de P4, la fase que le da al dashboard un aporte propio.

Salida observable: en `/dashboard`, tres secciones (actividades recientes, métricas de hoy, resumen semanal) se pueden arrastrar para reordenar y ocultar con un toggle; el orden/visibilidad sobrevive a un logout/login.

## Alcance

**Entra**: tabla `dashboard_layouts`, tres widgets (dos reusando contenido ya construido, uno nuevo), drag-and-drop real, Server Action para persistir el orden, pasada de estética sobre el dashboard completo (justificada por el pedido del usuario: drag-and-drop sobre cajas sin estilo no se siente bien).

**No entra** (diferido, no es una omisión):
- Métricas derivadas (carga, ratio agudo/crónico) y comparación plan vs. ejecutado: son los otros dos ítems de P4, cada uno su propio spec — acá solo se deja el sistema de widgets listo para que esos ítems agreguen un widget más cuando les toque.
- Tamaño/grilla de los widgets (todos ocupan el ancho completo, uno debajo del otro): un layout tipo grid con tamaños configurables es una complejidad aparte, no la pide el roadmap todavía.
- Widgets por tipo de deporte o filtros: fuera de alcance.

## Diseño

- **Se define la abstracción de "widget" recién ahora**, siguiendo la regla que ya estaba escrita en `apps/web/CLAUDE.md` ("antes de añadir el segundo tipo de widget, definir esa abstracción; antes no") — con tres widgets a la vez (dos existentes + uno nuevo), se cumple esa condición.
- **Un widget es una función `(userId) => Promise<ReactNode>` registrada por `key`**, no una clase ni una interfaz elaborada — "fuente de datos + transformación + visualización" del CLAUDE.md se resuelve en una sola función async por widget (trae sus datos, los formatea con `format.ts`, devuelve el JSX ya armado). Nada más elaborado hasta que un caso real lo pida.
  ```ts
  type WidgetKey = "recent_activities" | "today_metrics" | "weekly_summary";
  const WIDGET_REGISTRY: Record<WidgetKey, { label: string; render: (userId: string) => Promise<ReactNode> }>
  ```
- **`recent_activities` y `today_metrics` se extraen tal cual del `(app)/dashboard/page.tsx` actual** a sus propios archivos de widget — refactor, no lógica nueva.
- **`weekly_summary` es el widget nuevo**: distancia y cantidad de actividades de esta semana vs. la semana pasada. Necesita una función de repository nueva (`findWeeklySummary(userId)` en `activities.ts`, agrupando por rango de fechas) — es lógica real, no un refactor.
- **Layout guardado en `dashboard_layouts`** (nueva tabla, un row por usuario, `unique().on(userId)`): una columna `widgets: jsonb`, array de `{ key: WidgetKey, visible: boolean }` **en el orden en que se muestran** — el orden del array es el orden visual, no hace falta una columna de posición separada.
- **Server Components pasados como `children` a un Client Component**, patrón confirmado en los docs de Next.js (no algo inventado): la página (`(app)/dashboard/page.tsx`) sigue siendo Server Component — lee el layout guardado, renderiza cada widget visible **en el servidor** (con sus datos reales), y pasa esos nodos ya renderizados a un Client Component nuevo que solo maneja el drag-and-drop. El widget en sí nunca se vuelve a buscar ni renderizar en el cliente, solo se reordena visualmente.
- **`dnd-kit` para el drag-and-drop** — primera librería de interacción rica del proyecto, dependencia nueva en `apps/web`. Al soltar, un Server Action (`updateDashboardLayout(userId, widgets)`) persiste el nuevo orden en `dashboard_layouts`.
- **Mostrar/ocultar**: un toggle simple (checkbox) por widget, mismo Server Action que el reordenamiento — cualquier cambio de layout (orden o visibilidad) es una sola escritura a la misma fila.
- **Estética**: el dashboard entero pasa a tener el tratamiento visual real de `docs/style.md` (hoy son cajas con `border` genérico) — cada widget como una tarjeta reconocible, con un handle de arrastre visible, siguiendo el sistema de la app (glyphs mono, paleta, foco a ember). Lo escribo yo, mismo criterio que el resto del proyecto.

## Checklist de implementación

- [ ] Schema + migración: `dashboard_layouts` (`userId` único, `widgets: jsonb`)
- [ ] `packages/db/src/repositories/dashboard-layouts.ts`: get/upsert
- [ ] `findWeeklySummary(userId)` en `packages/db/src/repositories/activities.ts`
- [ ] Tres archivos de widget (`_components/widgets/`): `recent-activities.tsx`, `today-metrics.tsx` (extraídos), `weekly-summary.tsx` (nuevo)
- [ ] `WIDGET_REGISTRY` + lógica de la página: leer layout, renderizar visibles en orden
- [ ] Client Component de drag-and-drop (`dnd-kit`) que recibe los widgets ya renderizados como `children`
- [ ] Server Action `updateDashboardLayout`
- [ ] Estética: tarjetas de widget + handle de arrastre según `docs/style.md`
- [ ] Probado en vivo: reordenar persiste después de recargar, ocultar/mostrar funciona, un usuario sin `dashboard_layouts` todavía (primera vez) ve los tres widgets en un orden por defecto razonable

## Preguntas abiertas

Ninguna. Layout por defecto (usuario sin fila en `dashboard_layouts` todavía): los tres widgets visibles, en el orden del `WIDGET_REGISTRY`; la fila recién se crea en el primer cambio (reordenar o mostrar/ocultar).
