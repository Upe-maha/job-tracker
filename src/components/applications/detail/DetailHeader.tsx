// src/components/applications/detail/DetailHeader.tsx
'use client'

import { format } from 'date-fns'
import {
  MapPin,
  Banknote,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IApplication, ApplicationStatus } from '@/types'

const statusColors: Record<ApplicationStatus, string> = {
  wishlist:  'bg-muted text-muted-foreground border-border',
  applied:   'bg-blue-500/10 text-blue-500 border-blue-500/20',
  interview: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  offer:     'bg-green-500/10 text-green-500 border-green-500/20',
  rejected:  'bg-red-500/10 text-red-500 border-red-500/20',
}

interface DetailHeaderProps {
  application: IApplication
}

export default function DetailHeader({ application }: DetailHeaderProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">

      {/* Top row — logo + info + link */}
      <div className="flex items-start justify-between gap-4 flex-wrap">

        <div className="flex items-center gap-4">
          {/* Company logo or initial */}
          <div className="
            w-14 h-14 rounded-xl bg-muted
            flex items-center justify-center shrink-0
          ">
            {application.companyLogo ? (
              <img
                src={application.companyLogo}
                alt={application.company}
                className="w-14 h-14 rounded-xl object-cover"
              />
            ) : (
              <span className="text-foreground font-bold text-2xl">
                {application.company[0].toUpperCase()}
              </span>
            )}
          </div>

          {/* Company name + role + badges */}
          <div>
            <h1 className="text-foreground font-bold text-xl">
              {application.company}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {application.role}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`
                text-xs px-2.5 py-1 rounded-full border
                font-medium capitalize
                ${statusColors[application.status]}
              `}>
                {application.status}
              </span>
              {application.workMode && (
                <span className="
                  text-xs px-2.5 py-1 rounded-full border
                  bg-muted text-muted-foreground border-border capitalize
                ">
                  {application.workMode}
                </span>
              )}
              {application.jobType && (
                <span className="
                  text-xs px-2.5 py-1 rounded-full border
                  bg-muted text-muted-foreground border-border capitalize
                ">
                  {application.jobType}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* View job button */}
        {application.jobUrl && (
          <a
            href={application.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-border text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Job
            </Button>
          </a>
        )}
      </div>

      {/* Bottom row — details */}
      <div className="
        flex flex-wrap gap-x-6 gap-y-2
        mt-5 pt-5 border-t border-border
      ">
        {application.location && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm">{application.location}</span>
          </div>
        )}
        {(application.salaryMin || application.salaryMax) && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Banknote className="w-3.5 h-3.5" />
            <span className="text-sm">
              {application.salaryCurrency}{' '}
              {application.salaryMin?.toLocaleString()} -{' '}
              {application.salaryMax?.toLocaleString()}
            </span>
          </div>
        )}
        {application.appliedDate && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-sm">
              Applied {format(new Date(application.appliedDate), 'MMM d, yyyy')}
            </span>
          </div>
        )}
        {application.deadline && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-sm">
              Deadline {format(new Date(application.deadline), 'MMM d, yyyy')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}