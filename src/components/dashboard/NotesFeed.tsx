// src/components/dashboard/NotesFeed.tsx
'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { INoteFeedItem } from '@/types'
import { NOTE_TYPE_META } from '@/lib/display'
import NoteAttachmentChip from '@/components/notes/NoteAttachmentChip'

interface NotesFeedProps {
  notes: INoteFeedItem[]
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
          NOTE_TYPE_META[item.noteType] ?? NOTE_TYPE_META.general
        const Icon = config.icon

        return (
          // Link behind the card, not around it, so the attachment chip can be
          // clicked without navigating. See NoteAttachmentChip.
          <div key={item.noteId} className="relative">
            <Link
              href={`/applications/${item.applicationId}`}
              className="absolute inset-0 rounded-xl"
            >
              <span className="sr-only">Open {item.company} application</span>
            </Link>

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
                        <span>{config.shortLabel}</span>
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

                  {item.attachment && (
                    <NoteAttachmentChip
                      attachment={item.attachment}
                      className="relative z-10 mt-2 max-w-[70%]"
                    />
                  )}
                </div>

                {/* Arrow */}
                <ArrowRight className="
                  w-3.5 h-3.5 text-muted-foreground/30
                  group-hover:text-muted-foreground
                  transition-colors shrink-0 mt-0.5
                " />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}