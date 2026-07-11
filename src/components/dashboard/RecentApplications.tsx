// src/components/dashboard/RecentApplications.tsx
'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'

const statusColors: Record<string, string> = {
  wishlist:  'bg-muted text-muted-foreground border-border',
  applied:   'bg-blue-500/10 text-blue-500 border-blue-500/20',
  interview: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  offer:     'bg-green-500/10 text-green-500 border-green-500/20',
  rejected:  'bg-red-500/10 text-red-500 border-red-500/20',
}

interface RecentItem {
  _id: string
  company: string
  role: string
  status: string
  companyLogo?: string
  createdAt: string
}

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
                ${statusColors[app.status]}
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