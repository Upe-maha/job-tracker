// src/components/dashboard/DeadlinesList.tsx
'use client'

import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { Calendar, ArrowRight } from 'lucide-react'

interface DeadlineItem {
  _id: string
  company: string
  role: string
  status: string
  deadline?: string
  followUpDate?: string
  companyLogo?: string
}

interface DeadlinesListProps {
  deadlines: DeadlineItem[]
  followUps: DeadlineItem[]
}

export default function DeadlinesList({
  deadlines,
  followUps,
}: DeadlinesListProps) {
  const isEmpty = deadlines.length === 0 && followUps.length === 0

  if (isEmpty) {
    return (
      <div className="
        border-2 border-dashed border-border rounded-xl
        flex items-center justify-center h-28
      ">
        <p className="text-muted-foreground/50 text-sm">
          No upcoming deadlines or follow-ups.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">

      {/* Deadlines */}
      {deadlines.map(item => (
        <DeadlineRow
          key={item._id}
          item={item}
          date={item.deadline!}
          type="deadline"
        />
      ))}

      {/* Follow-ups */}
      {followUps.map(item => (
        <DeadlineRow
          key={item._id}
          item={item}
          date={item.followUpDate!}
          type="followup"
        />
      ))}
    </div>
  )
}

function DeadlineRow({
  item,
  date,
  type,
}: {
  item: DeadlineItem
  date: string
  type: 'deadline' | 'followup'
}) {
  const daysLeft = differenceInDays(new Date(date), new Date())
  const isUrgent = daysLeft <= 2

  return (
    <Link href={`/applications/${item._id}`}>
      <div className="
        bg-card border border-border rounded-lg px-4 py-3
        flex items-center justify-between gap-3
        hover:border-primary/30 transition-colors group
      ">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <div className="
            w-7 h-7 rounded-md bg-muted
            flex items-center justify-center
            text-foreground font-bold text-xs shrink-0
          ">
            {item.companyLogo ? (
              <img
                src={item.companyLogo}
                alt={item.company}
                className="w-7 h-7 rounded-md object-cover"
              />
            ) : (
              item.company[0].toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            <p className="text-foreground text-sm font-medium truncate">
              {item.company}
            </p>
            <p className="text-muted-foreground text-xs truncate">
              {item.role}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Type badge */}
          <span className={`
            text-xs px-2 py-0.5 rounded-full border
            ${type === 'deadline'
              ? isUrgent
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
              : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            }
          `}>
            {type === 'deadline' ? 'Deadline' : 'Follow up'}
          </span>

          {/* Date */}
          <div className="text-right">
            <p className={`text-xs font-medium ${
              isUrgent ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {format(new Date(date), 'MMM d')}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {daysLeft === 0
                ? 'Today'
                : daysLeft === 1
                ? 'Tomorrow'
                : `${daysLeft}d left`}
            </p>
          </div>

          <ArrowRight className="
            w-3.5 h-3.5 text-muted-foreground/30
            group-hover:text-muted-foreground
            transition-colors
          " />
        </div>
      </div>
    </Link>
  )
}