// src/components/applications/KanbanBoard.tsx
'use client'

import { useState, useEffect } from 'react'
import type { DropAnimation } from '@dnd-kit/core'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { IApplication, ApplicationStatus } from '@/types'
import ApplicationCard from './ApplicationCard'
import DraggableCard from './DraggableCard'
import { useQueryClient } from '@tanstack/react-query'

const statusColumns = [
  {
    key: 'wishlist' as const,
    label: 'Wishlist',
    color: 'text-muted-foreground',
    dotColor: 'bg-muted-foreground',
    emptyBorder: 'border-border',
  },
  {
    key: 'applied' as const,
    label: 'Applied',
    color: 'text-blue-500',
    dotColor: 'bg-blue-500',
    emptyBorder: 'border-blue-500/20',
  },
  {
    key: 'interview' as const,
    label: 'Interview',
    color: 'text-yellow-500',
    dotColor: 'bg-yellow-500',
    emptyBorder: 'border-yellow-500/20',
  },
  {
    key: 'offer' as const,
    label: 'Offer',
    color: 'text-green-500',
    dotColor: 'bg-green-500',
    emptyBorder: 'border-green-500/20',
  },
  {
    key: 'rejected' as const,
    label: 'Rejected',
    color: 'text-red-500',
    dotColor: 'bg-red-500',
    emptyBorder: 'border-red-500/20',
  },
] as const

const dropAnimation: DropAnimation = {
  duration: 0,
  easing: 'linear',
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: '0' },
    },
  }),
}

interface KanbanBoardProps {
  applications: IApplication[]
}

export default function KanbanBoard({ applications: initial }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [applications, setApplications] = useState<IApplication[]>(initial)
  const [activeCard, setActiveCard] = useState<IApplication | null>(null)

  useEffect(() => {
    if (!activeCard) {
      setApplications(initial)
    }
  }, [initial, activeCard])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const getGrouped = (apps: IApplication[]) => {
    return statusColumns.reduce((acc, col) => {
      acc[col.key] = apps.filter(app => app.status === col.key)
      return acc
    }, {} as Record<ApplicationStatus, IApplication[]>)
  }

  const grouped = getGrouped(applications)

  function onDragStart(event: DragStartEvent) {
    const card = applications.find(a => a._id === event.active.id)
    if (card) setActiveCard(card)
  }

  // ─── onDragOver – ONLY update status for live preview ───
  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    if (activeId === overId) return

    const activeApp = applications.find(a => a._id === activeId)
    if (!activeApp) return

    const overIsColumn = statusColumns.some(col => col.key === overId)
    let targetStatus: ApplicationStatus

    if (overIsColumn) {
      targetStatus = overId as ApplicationStatus
    } else {
      const overApp = applications.find(a => a._id === overId)
      if (!overApp) return
      targetStatus = overApp.status
    }

    // Only change status – no reordering here
    if (activeApp.status !== targetStatus) {
      setApplications(prev =>
        prev.map(app =>
          app._id === activeId ? { ...app, status: targetStatus } : app
        )
      )
    }
  }

  // ─── onDragEnd – rebuild the entire array with correct order ───
  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)

    if (!over) {
      setApplications(initial)
      return
    }

    const activeId = active.id as string
    const activeApp = applications.find(a => a._id === activeId)
    if (!activeApp) return

    const originalStatus = initial.find(a => a._id === activeId)?.status

    // Determine final status
    const overId = over.id as string
    const overIsColumn = statusColumns.some(col => col.key === overId)
    let finalStatus: ApplicationStatus

    if (overIsColumn) {
      finalStatus = overId as ApplicationStatus
    } else {
      const overApp = applications.find(a => a._id === overId)
      if (!overApp) {
        finalStatus = activeApp.status
      } else {
        finalStatus = overApp.status
      }
    }

    // Rebuild the array by iterating over columns in order
    const withoutActive = applications.filter(a => a._id !== activeId)
    const updatedActive = { ...activeApp, status: finalStatus }
    const newArray: IApplication[] = []

    for (const col of statusColumns) {
      // Get all cards for this column (excluding the active card)
      const columnCards = withoutActive.filter(a => a.status === col.key)

      if (col.key === finalStatus) {
        // This is the target column – insert the active card at the correct spot
        let insertIndex = columnCards.length // default: end of column

        if (!overIsColumn) {
          // Over is a specific card – insert before it
          const overCard = withoutActive.find(a => a._id === overId)
          if (overCard && overCard.status === finalStatus) {
            const idx = columnCards.findIndex(a => a._id === overId)
            if (idx !== -1) {
              insertIndex = idx
            }
          }
        }

        // Insert the card
        columnCards.splice(insertIndex, 0, updatedActive)
      }

      newArray.push(...columnCards)
    }

    // Update state with the correctly ordered array
    setApplications(newArray)

    // Only call API if status actually changed
    if (activeApp.status === originalStatus) return

    try {
      const res = await fetch(`/api/applications/${activeId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: finalStatus }),
      })

      if (!res.ok) {
        setApplications(initial)
        return
      }

      queryClient.invalidateQueries({ queryKey: ['applications'] })
    } catch (error) {
      console.error('Status update failed:', error)
      setApplications(initial)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
          {statusColumns.map(col => (
            <KanbanColumn
              key={col.key}
              column={col}
              cards={grouped[col.key]}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeCard ? (
          <div className="rotate-1 shadow-2xl">
            <ApplicationCard application={activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ── Column and DroppableColumn remain unchanged ──
// ... (they are the same as before)

// ── Column ───────────────────────────────────────────
interface KanbanColumnProps {
  column: typeof statusColumns[number]
  cards: IApplication[]
}

function KanbanColumn({ column, cards }: KanbanColumnProps) {
  return (
    <div className="w-[280px] flex flex-col shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${column.dotColor}`} />
        <span className={`font-semibold text-sm ${column.color}`}>
          {column.label}
        </span>
        <span className="ml-auto text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>

      <DroppableColumn columnId={column.key}>
        <SortableContext
          items={cards.map(c => c._id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.length === 0 ? (
            <div className={`
              border-2 border-dashed rounded-lg
              flex items-center justify-center
              min-h-[120px] ${column.emptyBorder}
            `}>
              <p className="text-muted-foreground/40 text-xs">Drop here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cards.map(app => (
                <DraggableCard key={app._id} application={app} />
              ))}
            </div>
          )}
        </SortableContext>
      </DroppableColumn>
    </div>
  )
}

// ── Droppable Column ─────────────────────────────────
function DroppableColumn({
  columnId,
  children,
}: {
  columnId: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col gap-3 flex-1
        rounded-xl p-3 min-h-[200px]
        transition-colors duration-150
        ${isOver ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30'}
      `}
    >
      {children}
    </div>
  )
}