// src/components/applications/DraggableCard.tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IApplication } from '@/types'
import { cn } from '@/lib/utils'
import ApplicationCard from './ApplicationCard'
import { Grip } from 'lucide-react'

interface DraggableCardProps {
  application: IApplication
}

export default function DraggableCard({ application }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition, // use dnd-kit's transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      // The drag styles used to sit on a `className` key inside `style`, where
      // React silently dropped them — the card never dimmed while dragging.
      className={cn(
        'relative group',
        isDragging && 'z-10 opacity-50 shadow-md cursor-grabbing'
      )}
    >
      {/* The handle was opacity-0 until hover, which meant it did not exist on
          a touch screen: no hover, no handle, and the only way to reorder the
          board was an invisible 20px target. Below lg it is therefore always
          visible and a full 44px.

          It sits *outside* the card's top-left corner on touch (-top-2 -left-2
          plus a ring) rather than over it, so enlarging the grab area does not
          steal taps from the company name underneath — a drag handle that
          swallows the card's own tap target trades one broken interaction for
          another. */}
      <div
      {...attributes}
      {...listeners}
      className="
          absolute z-20
          -top-2 -left-2 w-11 h-11 rounded-full bg-card ring-1 ring-border
          lg:top-3 lg:left-3 lg:w-5 lg:h-5 lg:rounded-none lg:bg-transparent lg:ring-0
          flex items-center justify-center
          opacity-100 lg:opacity-0 lg:group-hover:opacity-100
          transition-opacity duration-150 motion-reduce:transition-none
          cursor-grab active:cursor-grabbing
          text-muted-foreground hover:text-foreground
          touch-none select-none
        "
        title="Drag to move"
        aria-label="Drag to move card"
        >
        <Grip className="w-4 h-4" />
      </div>
      <ApplicationCard application={application} />
    </div>
  )
}