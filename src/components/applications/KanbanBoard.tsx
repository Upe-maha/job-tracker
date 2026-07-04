'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  UniqueIdentifier,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';

import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import { IApplication, ApplicationStatus } from '@/types'
import ApplicationCard from './ApplicationCard'
import DraggableCard from './DraggableCard'
import { useQueryClient } from '@tanstack/react-query'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const statusColumns = [
  { key: 'wishlist', label: 'Wishlist', dotColor: 'bg-muted-foreground', emptyBorder: 'border-border' },
  { key: 'applied', label: 'Applied', dotColor: 'bg-blue-500', emptyBorder: 'border-blue-500/20' },
  { key: 'interview', label: 'Interview', dotColor: 'bg-yellow-500', emptyBorder: 'border-yellow-500/20' },
  { key: 'offer', label: 'Offer', dotColor: 'bg-green-500', emptyBorder: 'border-green-500/20' },
  { key: 'rejected', label: 'Rejected', dotColor: 'bg-red-500', emptyBorder: 'border-red-500/20' },
] as const

type GroupedApps = Record<ApplicationStatus, IApplication[]>

export default function KanbanBoard({ applications: initial }: { applications: IApplication[] }) {
  const queryClient = useQueryClient()
  const [columns, setColumns] = useState<GroupedApps>(() => {
    const grouped = initial.reduce((acc, app) => {
      if (!acc[app.status]) acc[app.status] = []
      acc[app.status].push(app)
      return acc
    }, {} as GroupedApps)
    for (const col of statusColumns) {
      if (!grouped[col.key]) grouped[col.key] = []
    }
    return grouped
  })
  const [activeCard, setActiveCard] = useState<IApplication | null>(null)

  const sensors = useSensors(useSensor(PointerSensor,
    {
      activationConstraint: {
        delay: 100,
        tolerance: 5
      }
    }
  ), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }
  ))

  function findColumnId(itemId: string): ApplicationStatus | undefined {
    for (const [status, apps] of Object.entries(columns)) {
      if (apps.some(app => app._id === itemId)) return status as ApplicationStatus
    }
    if (statusColumns.some(col => col.key === itemId)) return itemId as ApplicationStatus
    return undefined
  }

  function onDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    const app = Object.values(columns).flat().find(a => a._id === id)
    if (app) setActiveCard(app)
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const activeColumnId = findColumnId(activeId)
    const overColumnId = findColumnId(overId)

    if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) return
    if (activeId === overId) return

    const activeApp = columns[activeColumnId]?.find(app => app._id === activeId)
    if (!activeApp) return

    setColumns(prev => {
      const sourceApps = prev[activeColumnId].filter(app => app._id !== activeId)
      const updatedApp = { ...activeApp, status: overColumnId }
      const targetApps = prev[overColumnId]
      let insertIndex = targetApps.length

      if (overId !== overColumnId) {
        const overIndex = targetApps.findIndex(app => app._id === overId)
        if (overIndex !== -1) insertIndex = overIndex
      }

      const newTarget = [
        ...targetApps.slice(0, insertIndex),
        updatedApp,
        ...targetApps.slice(insertIndex),
      ]

      return {
        ...prev,
        [activeColumnId]: sourceApps,
        [overColumnId]: newTarget,
      }
    })
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const activeColumnId = findColumnId(activeId)
    const overColumnId = findColumnId(overId)

    if (!activeColumnId || !overColumnId) return

    const activeApp = columns[activeColumnId]?.find(app => app._id === activeId)
    if (!activeApp) return

    // Update state
    setColumns(prev => {
      if (activeColumnId === overColumnId) {
        // Same column – reorder
        const apps = prev[activeColumnId]
        const activeIndex = apps.findIndex(app => app._id === activeId)
        let overIndex = apps.findIndex(app => app._id === overId)
        if (overIndex === -1) overIndex = apps.length - 1
        const newOrder = arrayMove(apps, activeIndex, overIndex)
        return { ...prev, [activeColumnId]: newOrder }
      } else {
        // Cross column
        const sourceApps = prev[activeColumnId].filter(app => app._id !== activeId)
        const updatedApp = { ...activeApp, status: overColumnId }
        const targetApps = prev[overColumnId]
        let insertIndex = targetApps.length
        if (overId !== overColumnId) {
          const overIndex = targetApps.findIndex(app => app._id === overId)
          if (overIndex !== -1) insertIndex = overIndex
        }
        const newTarget = [
          ...targetApps.slice(0, insertIndex),
          updatedApp,
          ...targetApps.slice(insertIndex),
        ]
        return {
          ...prev,
          [activeColumnId]: sourceApps,
          [overColumnId]: newTarget,
        }
      }
    })

    // API call for status change
    const originalStatus = initial.find(app => app._id === activeId)?.status
    if (activeApp.status !== originalStatus) {
      try {
        await fetch(`/api/applications/${activeId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: overColumnId }),
        })
        queryClient.invalidateQueries({ queryKey: ['applications'] })
      } catch (error) {
        console.error('Status update failed:', error)
        // Optionally revert to initial
        const grouped = initial.reduce((acc, app) => {
          if (!acc[app.status]) acc[app.status] = []
          acc[app.status].push(app)
          return acc
        }, {} as GroupedApps)
        for (const col of statusColumns) {
          if (!grouped[col.key]) grouped[col.key] = []
        }
        setColumns(grouped)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
          {statusColumns.map(col => (
            <KanbanColumn key={col.key} column={col} cards={columns[col.key] || []} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeCard ? (
          <div className="rotate-1 shadow-2xl">
            <ApplicationCard application={activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// --- Subcomponents ---
function KanbanColumn({ column, cards }: { column: typeof statusColumns[number], cards: IApplication[] }) {
  return (
    <div className="w-[280px] flex flex-col shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${column.dotColor}`} />
        <span className="font-semibold text-sm">{column.label}</span>
        <span className="ml-auto text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>
      <DroppableColumn columnId={column.key}>
        <SortableContext items={cards.map(c => c._id)} strategy={verticalListSortingStrategy}>
          {cards.length === 0 ? (
            <div className={`border-2 border-dashed rounded-lg flex items-center justify-center min-h-[120px] ${column.emptyBorder}`}>
              <p className="text-muted-foreground/40 text-xs">Drop here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cards.map(app => <DraggableCard key={app._id} application={app} />)}
            </div>
          )}
        </SortableContext>
      </DroppableColumn>
    </div>
  )
}

function DroppableColumn({ columnId, children }: { columnId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-3 flex-1 rounded-xl p-3 min-h-[200px] transition-colors duration-150 ${isOver ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30'
        }`}
    >
      {children}
    </div>
  )
}