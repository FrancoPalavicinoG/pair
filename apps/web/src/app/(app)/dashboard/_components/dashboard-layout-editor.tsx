"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DashboardWidgets } from "@pair/db";
import { updateDashboardLayout } from "../actions";
import type { WidgetKey } from "./widgets/registry";

export type WidgetItem = { key: WidgetKey; label: string; node: ReactNode };

const GRID_GAP = 16;
// Piso de tile: por debajo de esto el contenido de un StatTile se amontona (confirmado
// esta sesión con ~107px). Si ni al piso entran todos los widgets en el alto disponible,
// se permite scroll — es la salvedad explícita al "nunca scroll".
const MIN_TILE_SIZE = 180;
// Espacio a dejar libre debajo del contenedor para que no toque el borde inferior del
// viewport — calca el py-10 (40px) de <main> en app-shell.tsx.
const BOTTOM_MARGIN = 40;

// Elige cols/tileSize para que los widgets llenen el rectángulo W×H sin scroll: prueba
// cada cantidad de columnas, se queda con la que da el tile más grande sin bajar del piso.
// Si ninguna combinación llega al piso, cae a modo "scroll": tile fijo al piso, tantas
// columnas como entren de ancho — el contenedor (con overflow-y-auto) hace el resto.
function computeGridLayout(count: number, width: number, height: number) {
  if (count === 0 || width <= 0 || height <= 0) {
    return { cols: 1, tileSize: MIN_TILE_SIZE };
  }

  let best: { cols: number; tileSize: number } | null = null;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const tileW = (width - (cols - 1) * GRID_GAP) / cols;
    const tileH = (height - (rows - 1) * GRID_GAP) / rows;
    const tileSize = Math.min(tileW, tileH);
    if (tileSize >= MIN_TILE_SIZE && (!best || tileSize > best.tileSize)) {
      best = { cols, tileSize };
    }
  }
  if (best) return best;

  const cols = Math.max(1, Math.floor((width + GRID_GAP) / (MIN_TILE_SIZE + GRID_GAP)));
  return { cols, tileSize: MIN_TILE_SIZE };
}

export function DashboardLayoutEditor({
  initialWidgets,
  hiddenKeys,
}: {
  initialWidgets: WidgetItem[];
  hiddenKeys: WidgetKey[];
}) {
  const [items, setItems] = useState<WidgetItem[]>(initialWidgets);
  const sensors = useSensors(useSensor(PointerSensor));
  const containerRef = useRef<HTMLDivElement>(null);
  // Alto disponible calculado directo desde el viewport (window.innerHeight - la posición
  // del contenedor), no vía cadena de h-full/min-h-0 — esa cadena pasa por <main>, que
  // comparten todas las rutas, y forzarla ahí rompe el scroll natural de las demás páginas.
  const [box, setBox] = useState({ width: 0, height: 0 });
  const grid = computeGridLayout(items.length, box.width, box.height);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const recompute = () => {
      const rect = el.getBoundingClientRect();
      setBox({ width: el.clientWidth, height: window.innerHeight - rect.top - BOTTOM_MARGIN });
    };
    recompute();

    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  function buildLayout(currentItems: WidgetItem[]): DashboardWidgets {
    const visibleWidgets = currentItems.map((i) => ({ key: i.key, visible: true }));
    const hiddenWidgets = hiddenKeys.map((key) => ({ key, visible: false }));
    return [...visibleWidgets, ...hiddenWidgets];
  }

  function handleHide(key: WidgetKey) {
    const remainingItems = items.filter((item) => item.key !== key);
    setItems(remainingItems);
    updateDashboardLayout(buildLayout(remainingItems));
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeKey = event.active.id as WidgetKey;
    const overKey = event.over?.id as WidgetKey | undefined;

    if (!overKey || activeKey === overKey) {
      return; // No se hizo un cambio de posición válido
    }

    const oldIndex = items.findIndex((item) => item.key === activeKey);
    const newIndex = items.findIndex((item) => item.key === overKey);

    if (oldIndex === -1 || newIndex === -1) {
      return; // No se encontró alguno de los elementos
    }

    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);
    updateDashboardLayout(buildLayout(newItems));
  }

  return (
    <div ref={containerRef} style={{ height: box.height || undefined }} className="w-full overflow-y-auto">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.key)} strategy={rectSortingStrategy}>
          <div
            className="grid w-full justify-center content-center"
            style={{
              height: box.height || undefined,
              gridTemplateColumns: `repeat(${grid.cols}, ${grid.tileSize}px)`,
              gridAutoRows: `${grid.tileSize}px`,
              gap: `${GRID_GAP}px`,
            }}
          >
            {items.map((item) => (
              <SortableWidgetTile key={item.key} item={item} onHide={handleHide} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableWidgetTile({
  item,
  onHide,
}: {
  item: WidgetItem;
  onHide: (key: WidgetKey) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.key,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="group relative border border-rule-soft transition-colors duration-[250ms] hover:border-ink"
    >
      <span
        {...attributes}
        {...listeners}
        className="absolute left-2 top-2 z-10 cursor-grab font-mono text-xs leading-none text-graphite transition-colors duration-[250ms] active:cursor-grabbing group-hover:text-panel-muted"
        aria-label={`Drag ${item.label}`}
      >
        ⋮⋮
      </span>
      <button
        type="button"
        aria-label={`Hide ${item.label}`}
        className="absolute right-2 top-2 z-10 font-mono text-xs leading-none text-graphite opacity-0 transition-colors duration-[250ms] hover:text-bone focus-visible:opacity-100 focus-visible:text-ink group-hover:text-panel-muted group-hover:opacity-100 group-focus-within:opacity-100"
        onClick={() => onHide(item.key)}
      >
        ×
      </button>
      <Link href={`/dashboard/metrics/${encodeURIComponent(item.key)}`} className="block">
        {item.node}
      </Link>
    </div>
  );
}
