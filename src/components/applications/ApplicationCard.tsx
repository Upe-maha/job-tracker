// src/components/applications/ApplicationCard.tsx
'use client'

import { IApplication } from '@/types'
import { MapPin, ExternalLink, FileText, Calendar, Banknote, Link, ArrowRight, } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ApplicationCardProps {
  application: IApplication
  // When used inside DraggableCard, dragging is handled by parent
  // onClick should only fire if not dragging
  onClick?: () => void
}

const workModeColors: Record<string, string> = {
  remote: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  hybrid: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  'on-site': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
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
              className="text-muted-foreground hover:text-foreground transition-colors"
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
          <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
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