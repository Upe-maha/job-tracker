// src/components/dashboard/NotesFeed.tsx
'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import {
  MessageSquare,
  Brain,
  BookOpen,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { INoteFeedItem } from '@/types'

interface NotesFeedProps {
  notes: INoteFeedItem[]
}

const noteTypeConfig = {
  interview_question: {
    label: 'Interview Q',
    icon: MessageSquare,
    color: 'text-blue-500',
    dot: 'bg-blue-500',
  },
  personal_experience: {
    label: 'Experience',
    icon: Brain,
    color: 'text-purple-500',
    dot: 'bg-purple-500',
  },
  experience_log: {
    label: 'Exp Log',
    icon: BookOpen,
    color: 'text-orange-500',
    dot: 'bg-orange-500',
  },
  general: {
    label: 'Note',
    icon: FileText,
    color: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
}

export default function NotesFeed({ notes }: NotesFeedProps) {
  if (notes.length === 0) {
    return (
      <div className="
        border-2 border-dashed border-border rounded-xl
        flex items-center justify-center h-32
      ">
        <p className="text-muted-foreground/50 text-sm">
          No notes yet. Add notes to your applications.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notes.map(item => {
        const config =
          noteTypeConfig[item.noteType as keyof typeof noteTypeConfig]
          ?? noteTypeConfig.general
        const Icon = config.icon

        return (
          <Link
            key={item.noteId}
            href={`/applications/${item.applicationId}`}
            className="block"
          >
            <div className="
              bg-card border border-border rounded-xl p-4
              hover:border-primary/30 hover:shadow-sm
              transition-all duration-150 group
            ">
              <div className="flex items-start gap-3">

                {/* Company logo or initial */}
                <div className="
                  w-9 h-9 rounded-lg bg-muted
                  flex items-center justify-center
                  shrink-0 text-foreground font-bold text-sm
                ">
                  {item.companyLogo ? (
                    <img
                      src={item.companyLogo}
                      alt={item.company}
                      className="w-9 h-9 rounded-lg object-cover"
                    />
                  ) : (
                    item.company[0].toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Company + note type + date */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground font-medium text-sm">
                        {item.company}
                      </span>
                      <div className={`
                        flex items-center gap-1 text-xs ${config.color}
                      `}>
                        <Icon className="w-3 h-3" />
                        <span>{config.label}</span>
                      </div>
                    </div>
                    <span className="text-muted-foreground/60 text-xs shrink-0">
                      {format(new Date(item.createdAt), 'MMM d')}
                    </span>
                  </div>

                  {/* Note preview */}
                  <p className="
                    text-muted-foreground text-xs
                    line-clamp-2 leading-relaxed
                  ">
                    {item.content}
                  </p>
                </div>

                {/* Arrow */}
                <ArrowRight className="
                  w-3.5 h-3.5 text-muted-foreground/30
                  group-hover:text-muted-foreground
                  transition-colors shrink-0 mt-0.5
                " />
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}