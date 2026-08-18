// src/components/dashboard/RecentApplications.tsx
'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'

import { APPLICATION_STATUS_META } from '@/shared/display'
import type { IApplicationCard } from '@/types'

// Matches the projection /api/dashboard returns for this widget — the shared
// card type rather than a fourth hand-written copy of the same five fields.
type RecentItem = IApplicationCard & { createdAt: string }

interface RecentApplicationsProps {
  applications: RecentItem[]
}

export default function RecentApplications({
  applications,
}: RecentApplicationsProps) {
  if (applications.length === 0) {
    return (
      <div className="
        border-2 border-dashed border-border rounded-xl
        flex items-center justify-center h-28
      ">
        <p className="text-muted-foreground/50 text-sm">
          No applications yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {applications.map(app => (
        <Link key={app._id} href={`/applications/${app._id}`}>
          <div className="
            bg-card border border-border rounded-lg px-4 py-3
            flex items-center justify-between gap-3
            hover:border-primary/30 transition-colors group
          ">
            <div className="flex items-center gap-3 min-w-0">
              <div className="
                w-7 h-7 rounded-md bg-muted
                flex items-center justify-center
                text-foreground font-bold text-xs shrink-0
              ">
                {app.companyLogo ? (
                  <img
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    src={app.companyLogo}
                    alt={app.company}
                    className="w-7 h-7 rounded-md object-cover"
                  />
                ) : (
                  app.company[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium truncate">
                  {app.company}
                </p>
                <p className="text-muted-foreground text-xs truncate">
                  {app.role}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className={`
                text-xs px-2 py-0.5 rounded-full border capitalize
                ${APPLICATION_STATUS_META[app.status].badge}
              `}>
                {app.status}
              </span>
              <span className="text-xs text-muted-foreground/60">
                {format(new Date(app.createdAt), 'MMM d')}
              </span>
              <ArrowRight className="
                w-3.5 h-3.5 text-muted-foreground/30
                group-hover:text-muted-foreground
                transition-colors
              " />
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}