// src/components/applications/ApplicationCard.tsx
'use client'

import { IApplication } from '@/types'
import { MapPin, ExternalLink, FileText, Calendar, Banknote, } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface ApplicationCardProps {
  application: IApplication
  // When used inside DraggableCard, dragging is handled by parent
  // onClick should only fire if not dragging
  onClick?: () => void
}

const workModeColors: Record<string, string> = {
  remote: 'bg-stage-offer text-stage-offer-fg dark:text-stage-offer-fg border-stage-offer-fg/20',
  hybrid: 'bg-stage-interview text-stage-interview-fg dark:text-stage-interview-fg border-stage-interview-fg/20',
  'on-site': 'bg-stage-applied text-stage-applied-fg dark:text-stage-applied-fg border-stage-applied-fg/20',
}

export default function ApplicationCard({ application }: ApplicationCardProps) {
  const router = useRouter()
  const noteCount = application.notes?.length ?? 0


  function handleViewDetails(e: React.MouseEvent) {
    // Stop event from bubbling to drag listeners
    e.stopPropagation()
    e.preventDefault()
    router.push(`/applications/${application._id}`)
  }

  return (
    <div
      onClick={handleViewDetails}
      className="
        bg-card border border-border rounded-lg p-4
        hover:border-primary/40 hover:shadow-sm
        transition-all duration-150 cursor-pointer
        select-none
      "
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="
            w-8 h-8 rounded-md bg-muted
            flex items-center justify-center shrink-0
          ">
            {application.companyLogo ? (
              <img
                referrerPolicy="no-referrer"
                loading="lazy"
                src={application.companyLogo}
                alt={application.company}
                className="w-8 h-8 rounded-md object-cover"
              />
            ) : (
              <span className="text-foreground font-bold text-sm">
                {application.company[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-foreground font-medium text-sm leading-none">
              {application.company}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {application.role}
            </p>
          </div>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-1.5">
          {application.jobUrl && (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              aria-label="Open job posting"
              // -m-3 p-3 grows the hit area to 44px without moving anything
              // around it: the padding expands the box, the negative margin
              // gives the space back to the layout.
              className="
                text-muted-foreground hover:text-foreground transition-colors
                w-11 h-11 -m-3 lg:w-auto lg:h-auto lg:m-0
                flex items-center justify-center
              "
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <div className={`flex items-center gap-1 ${noteCount > 0 ? 'text-primary' : 'text-muted-foreground/30'
            }`}>
            <FileText className="w-3.5 h-3.5" />
            {noteCount > 0 && (
              <span className="text-xs font-medium">{noteCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {application.workMode && (
          <span className={`
            text-xs px-2 py-0.5 rounded-full border
            ${workModeColors[application.workMode] ?? 'bg-muted text-muted-foreground border-border'}
          `}>
            {application.workMode}
          </span>
        )}
        {application.jobType && (
          <span className="
            text-xs px-2 py-0.5 rounded-full border
            bg-muted text-muted-foreground border-border
          ">
            {application.jobType}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        {application.location && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="text-xs truncate">{application.location}</span>
          </div>
        )}
        {(application.salaryMin || application.salaryMax) && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Banknote className="w-3 h-3 shrink-0" />
            <span className="text-xs">
              {application.salaryCurrency}{' '}
              {application.salaryMin?.toLocaleString()} -{' '}
              {application.salaryMax?.toLocaleString()}
            </span>
          </div>
        )}
        {application.appliedDate && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="text-xs">
              Applied {format(new Date(application.appliedDate), 'MMM d')}
            </span>
          </div>
        )}
        {application.followUpDate && (
          <div className="flex items-center gap-1.5 text-stage-interview-fg dark:text-stage-interview-fg">
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="text-xs">
              Follow up {format(new Date(application.followUpDate), 'MMM d')}
            </span>
          </div>
        )}
      </div>
       {/*<div className="pt-1 border-t border-border mt-auto">
        <Button
          onClick={handleViewDetails}
          variant="ghost"
          size="sm"
          className="
            w-full h-8 text-xs
            text-muted-foreground hover:text-foreground
            hover:bg-muted justify-between
          "
        >
          View Details
          <ArrowRight className="w-3.5 h-3.5" />
        </Button> 
      </div> */}
    </div>
  )
}