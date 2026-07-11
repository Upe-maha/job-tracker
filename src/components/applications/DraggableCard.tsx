// src/components/applications/DraggableCard.tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IApplication } from '@/types'
import ApplicationCard from './ApplicationCard'
import { Grip } from 'lucide-react';

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
    transition,// use dnd-kit's transition,
    className: isDragging ? 'z-10 opacity-50 shadow-md cursor-grabbing' : '',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <div 
      {...attributes}
      {...listeners}
      className="
          absolute top-3 left-3 z-20
          w-5 h-5
          flex items-center justify-center
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
          cursor-grab active:cursor-grabbing
          text-muted-foreground hover:text-foreground
          touch-none select-none
        "
        title="Drag to move"
        >
        <Grip className="w-4 h-4" />
      </div>
      <ApplicationCard application={application} />
    </div>
  )
}