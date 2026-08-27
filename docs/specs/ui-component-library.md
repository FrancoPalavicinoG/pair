# Spec: Librería de componentes de UI propios

Roadmap: P4 (Dashboard personalizable), nuevo ítem ("Librería de componentes de UI")
Estado: hecho

## Objetivo

Que los patrones visuales que `docs/style.md` ya define (botón primary/outline/confirm, fila tipo lista) vivan en un componente propio, no repetidos como clases de Tailwind inline en cada formulario o página. Es la base sobre la que se construyen los specs siguientes (visualización, widgets v2): un widget o gráfico nuevo se arma llamando a estos componentes, no copiando clases de nuevo.

Salida observable: `PairButton` reemplaza los tres bloques de botón hoy duplicados (`auth-form.tsx`, `garmin-connect-form.tsx`, `dashboard/page.tsx` ×3); ningún archivo de `apps/web` define el estilo de un botón a mano.

## Alcance

**Entra**: `PairButton` (variantes `primary` / `outline` / `confirm`, estado disabled/inert), y `ListRow` (el patrón "fila con `border-rule-soft`, hover a `border-ink`" que hoy se repite en `recent-activities.tsx` y `dashboard/widgets/page.tsx`).

**Ajustado al implementar**: el wrapper `SortableWidgetTile` de `dashboard-layout-editor.tsx` (tercer candidato original de `ListRow`) quedó afuera — no es una fila simple, es un contenedor con `ref` de drag-and-drop, handle y botón de cierre superpuestos, contenido vertical arbitrario. Forzarlo a `ListRow` hubiera roto la idea de "wrapper delgado". Se deja como está.

**No entra** (diferido, no es una omisión):
- Componentes de input (`$` prefix, MFA boxes, select propio): hoy solo existen en `auth-form.tsx` y `garmin-connect-form.tsx`, casi idénticos pero no vale la pena forzar la abstracción con un solo caso de uso real de cada variante — se revisa cuando aparezca un tercer formulario.
- `StatTile`: ya es su propio componente desde el refactor anterior, no hace falta tocarlo acá.
- Sistema de theming/props de color: `PairButton` no expone una prop de color libre, solo las variantes que `docs/style.md` ya definió — no se inventa flexibilidad que el spec de branding no pidió.

## Diseño

- **`PairButton` vive en `apps/web/src/components/`** (junto a `Wordmark`/`Eyebrow`, mismo criterio: compartido entre rutas, sin estado propio salvo lo que ya maneja un `<button>` nativo).
- **Tres variantes, no una prop de clases libres**: `variant: "primary" | "outline" | "confirm"`, transcripción 1:1 de la sección Botones de `docs/style.md`. `confirm` no tiene consumidor real todavía (llega en P3, patrón preview→confirm), pero el componente ya lo soporta porque el spec de marca ya lo definió — no es invención nueva, es transcribir lo que ya está escrito.
- **`disabled` controla el estado inerte de `confirm`** (`border-rule-soft`, texto grafito apagado, `cursor: not-allowed`), no una prop aparte — mismo mecanismo nativo de HTML que ya usan `auth-form.tsx`/`garmin-connect-form.tsx` con `pending`.
- **`ListRow` es un wrapper delgado** (`<Link>` o `<button>` según reciba `href` o `onClick`) con el estilo de fila ya validado — no absorbe lógica de negocio, solo el contenedor.
- Reemplazo en los 5 lugares identificados (`auth-form.tsx`, `garmin-connect-form.tsx`, `dashboard/page.tsx` ×3 para `PairButton`; `recent-activities.tsx`, `dashboard/widgets/page.tsx`, `dashboard-layout-editor.tsx` para `ListRow`) es parte de este mismo spec, no un follow-up — un componente sin sus usos migrados no demuestra que funciona.

## Checklist de implementación

- [x] `PairButton` (`apps/web/src/components/pair-button.tsx`): variantes primary/outline/confirm, estado disabled
- [x] `ListRow` (`apps/web/src/components/list-row.tsx`)
- [x] Migrar los 5 usos de botón identificados a `PairButton`
- [x] Migrar los 2 usos de fila identificados a `ListRow` (ver "Ajustado al implementar" arriba sobre el tercero)
- [x] `docs/style.md`: nota en la sección Botones apuntando a `PairButton`, y en Inputs apuntando a `ListRow`
- [x] `pnpm typecheck` / `pnpm lint` verdes, revisión visual de las pantallas tocadas confirmada sin diferencia perceptible (capturas antes/después)

## Bug encontrado y corregido durante la implementación

`outline-none` + `focus-visible:outline-2 focus-visible:outline-ember` nunca pintaba el anillo de foco, en ningún botón/fila del proyecto (bug preexistente, no introducido en este spec). Causa: Tailwind v4 delega `outline-style` a una variable compartida `--tw-outline-style`, que `outline-none` deja en `none` de forma permanente en el elemento — un `focus-visible:outline-2` posterior nunca la vuelve a poner en `solid`. Fix: `focus-visible:[--tw-outline-style:solid]`. Verificado con foco real de teclado + `getComputedStyle` (con reflow forzado — una primera lectura apurada sin reflow devuelve el valor viejo y hace parecer que el bug sigue). Documentado en `docs/style.md`, Gotchas técnicos, y aplicado también a `NavLink` (mismo bug, de la sesión anterior).
