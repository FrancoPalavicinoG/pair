"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DashboardWidgets } from "@pair/db";
import { updateDashboardLayout } from "../actions";
import type { WidgetKey } from "./widgets/registry";

export type WidgetItem = { key: WidgetKey; label: string; node: ReactNode };

export function DashboardLayoutEditor({
  initialWidgets,
  hiddenKeys,
}: {
  initialWidgets: WidgetItem[];
  hiddenKeys: WidgetKey[];
}) {
  const [items, setItems] = useState<WidgetItem[]>(initialWidgets);
  const sensors = useSensors(useSensor(PointerSensor));

  function buildLayout(currentItems: WidgetItem[]): DashboardWidgets {
    const visibleWidgets = currentItems.map((i) => ({ key: i.key, visible: true }));
    const hiddenWidgets = hiddenKeys.map((key) => ({ key, visible: false }));
    return [...visibleWidgets, ...hiddenWidgets];
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

  function handleHide(key: WidgetKey) {
    const remainingItems = items.filter((item) => item.key !== key);
    setItems(remainingItems);
    updateDashboardLayout(buildLayout(remainingItems));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.key)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <SortableWidgetTile key={item.key} item={item} onHide={handleHide} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
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
      className="group relative space-y-2 border border-rule-soft py-4 pl-9 pr-9 transition-colors hover:border-ink"
    >
      <span
        {...attributes}
        {...listeners}
        className="absolute left-3 top-4 cursor-grab font-mono text-graphite active:cursor-grabbing"
        aria-label={`Drag ${item.label}`}
      >
        ⋮⋮
      </span>
      <button
        type="button"
        aria-label={`Hide ${item.label}`}
        className="absolute right-3 top-3 font-mono text-graphite opacity-0 transition-colors hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
        onClick={() => onHide(item.key)}
      >
        ×
      </button>
      {item.node}
    </div>
  );
}
