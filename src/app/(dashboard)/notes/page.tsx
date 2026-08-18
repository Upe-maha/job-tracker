// src/app/(dashboard)/notes/page.tsx
'use client'

import { useState } from 'react'
import { useNotesFeed } from '@/hooks/useQueries'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowRight, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NOTE_FILTERS, NOTE_TYPE_META, type NoteFilterKey } from '@/shared/display'
import PageShell from '@/components/common/PageShell'
import ErrorState from '@/components/common/ErrorState'
import { ListSkeleton } from '@/components/common/Skeletons'
import NoteAttachmentChip from '@/components/notes/NoteAttachmentChip'



export default function NotesPage() {
  // Filtering is a query param, not an Array.filter: the page is paginated, so
  // client-side filtering would only ever search the pages already loaded.
  const [activeFilter, setActiveFilter] = useState<NoteFilterKey>('all')

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotesFeed(activeFilter)

  const notes = data?.pages.flatMap(page => page.notes) ?? []

  return (
    <PageShell>

      {/* Filter pills — always interactive, even while the list loads, so
          changing filter never waits on the previous request. */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {NOTE_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`
              text-xs px-3 py-1.5 min-h-9 lg:min-h-0 rounded-full border
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

      {isLoading && <ListSkeleton rows={4} />}

      {!isLoading && isError && (
        <ErrorState error={error} onRetry={() => refetch()} isRetrying={isFetching} />
      )}

      {!isLoading && !isError && notes.length === 0 && (
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

      {!isLoading && !isError && notes.length > 0 && (
        <div className="space-y-3">
          {notes.map(item => {
            const config =
              NOTE_TYPE_META[item.noteType] ?? NOTE_TYPE_META.general
            const Icon = config.icon

            return (
              // The link is an overlay behind the card, not a wrapper, so the
              // attachment chip can sit above it. See NoteAttachmentChip.
              <div
                key={item.noteId}
                className={`
                  relative border rounded-xl p-4
                  hover:shadow-sm transition-all duration-150
                  group ${config.bg}
                `}
              >
                <Link
                  href={`/applications/${item.applicationId}`}
                  className="absolute inset-0 rounded-xl"
                >
                  <span className="sr-only">
                    Open {item.company} application
                  </span>
                </Link>

                <div>
                  <div className="flex items-start gap-3">

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

                      <p className="
                        text-foreground/80 text-sm
                        line-clamp-3 leading-relaxed
                      ">
                        {item.content}
                      </p>

                      {/* relative z-10 lifts it above the overlay link. */}
                      {item.attachment && (
                        <NoteAttachmentChip
                          attachment={item.attachment}
                          className="relative z-10 mt-2 max-w-[70%]"
                        />
                      )}
                    </div>

                    <ArrowRight className="
                      w-3.5 h-3.5 shrink-0 mt-1
                      text-muted-foreground/30
                      group-hover:text-muted-foreground
                      transition-colors
                    " />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

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

    </PageShell>
  )
}
