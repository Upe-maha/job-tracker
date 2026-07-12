// src/app/(dashboard)/notes/page.tsx
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  MessageSquare,
  Brain,
  BookOpen,
  FileText,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const noteTypeConfig = {
  interview_question: {
    label: 'Interview Question',
    icon: MessageSquare,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  personal_experience: {
    label: 'Personal Experience',
    icon: Brain,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500/20',
    dot: 'bg-purple-500',
  },
  experience_log: {
    label: 'Experience Log',
    icon: BookOpen,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10 border-orange-500/20',
    dot: 'bg-orange-500',
  },
  general: {
    label: 'General Note',
    icon: FileText,
    color: 'text-muted-foreground',
    bg: 'bg-muted border-border',
    dot: 'bg-muted-foreground',
  },
}

const filters = [
  { key: 'all', label: 'All Notes' },
  { key: 'interview_question', label: 'Interview Questions' },
  { key: 'personal_experience', label: 'Experiences' },
  { key: 'experience_log', label: 'Experience Logs' },
  { key: 'general', label: 'General' },
]

async function fetchNotes() {
  const res = await fetch('/api/dashboard')
  if (!res.ok) throw new Error('Failed to fetch')
  const data = await res.json()
  return data.notesFeed
}

export default function NotesPage() {
  const [activeFilter, setActiveFilter] = useState('all')

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes-feed'],
    queryFn: fetchNotes,
  })

  const filtered = activeFilter === 'all'
    ? notes
    : notes.filter((n: any) => n.noteType === activeFilter)

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">Notes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All notes across your job applications
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`
              text-xs px-3 py-1.5 rounded-full border
              transition-colors duration-150
              ${activeFilter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/30'
              }
            `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground text-sm">Loading notes...</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="
          border-2 border-dashed border-border rounded-xl
          flex flex-col items-center justify-center h-40 gap-2
        ">
          <p className="text-muted-foreground/50 text-sm">
            No notes found.
          </p>
          <p className="text-muted-foreground/30 text-xs">
            Add notes from an application detail page.
          </p>
        </div>
      )}

      {/* Notes list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item: any) => {
            const config =
              noteTypeConfig[item.noteType as keyof typeof noteTypeConfig]
              ?? noteTypeConfig.general
            const Icon = config.icon

            return (
              <Link
                key={item.noteId}
                href={`/applications/${item.applicationId}`}
              >
                <div className={`
                  border rounded-xl p-4
                  hover:shadow-sm transition-all duration-150
                  group ${config.bg}
                `}>
                  <div className="flex items-start gap-3">

                    {/* Company logo */}
                    <div className="
                      w-9 h-9 rounded-lg bg-background/50
                      flex items-center justify-center
                      shrink-0 font-bold text-sm text-foreground
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
                      {/* Top row */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
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
                          {format(new Date(item.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>

                      {/* Note content */}
                      <p className="
                        text-foreground/80 text-sm
                        line-clamp-3 leading-relaxed
                      ">
                        {item.content}
                      </p>
                    </div>

                    <ArrowRight className="
                      w-3.5 h-3.5 shrink-0 mt-1
                      text-muted-foreground/30
                      group-hover:text-muted-foreground
                      transition-colors
                    " />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

    </div>
  )
}