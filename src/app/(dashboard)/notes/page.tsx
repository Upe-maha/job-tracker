// src/app/(dashboard)/notes/page.tsx
'use client'

import { useState } from 'react'
import { useNotesFeed } from '@/hooks/useQueries'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowRight, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NOTE_FILTERS, NOTE_TYPE_META, type NoteFilterKey } from '@/lib/display'



export default function NotesPage() {
  // Filtering is a query param rather than an Array.filter: the page is
  // paginated, so filtering client-side would only ever search the pages
  // already loaded.
  const [activeFilter, setActiveFilter] = useState<NoteFilterKey>('all')

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotesFeed(activeFilter)

  const notes = data?.pages.flatMap(page => page.notes) ?? []

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
        {NOTE_FILTERS.map(f => (
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
      {!isLoading && notes.length === 0 && (
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
      {!isLoading && notes.length > 0 && (
        <div className="space-y-3">
          {notes.map(item => {
            const config =
              NOTE_TYPE_META[item.noteType] ?? NOTE_TYPE_META.general
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
                          referrerPolicy="no-referrer"
                          loading="lazy"
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

      {/* Load more */}
      {hasNextPage && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}

    </div>
  )
}
