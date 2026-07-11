#Phase 6 — Drag and Drop Kanban
## how does this work
DndContext          → wraps everything, manages drag state
SortableContext     → wraps each column's cards
useSortable         → makes each card draggable
useDrop (via DndContext onDragEnd) → handles where card was dropped


#Step 1 — Update KanbanBoard with Drag and Drop [src/components/applications/KanbanBoard.tsx]
