// src/components/applications/DraggableCard.tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IApplication } from '@/types'
import ApplicationCard from './ApplicationCard'

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
    transition// use dnd-kit's transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-none select-none ${isDragging ? 'z-10 opacity-50 shadow-md' : ''}`}
    >
      <ApplicationCard application={application} />
    </div>
  )
}