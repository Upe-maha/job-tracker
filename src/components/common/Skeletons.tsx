// src/components/common/Skeletons.tsx
'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { PageGrid } from './PageShell'

// Each skeleton mirrors the real layout it stands in for — same card count,
// same grid spans, same heights — so the page does not reflow when data
// arrives. A generic spinner would let the content jump on every load.

function Card({ className = '' }: { className?: string }) {
  return <Skeleton className={`rounded-xl ${className}`} />
}

export function StatsGridSkeleton() {
  return (
    <PageGrid>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="md:col-span-3">
          <Card className="h-24" />
        </div>
      ))}
    </PageGrid>
  )
}

export function DashboardSkeleton() {
  return (
    <>
      <StatsGridSkeleton />
      <PageGrid>
        <div className="md:col-span-7 space-y-6">
          <Card className="h-64" />
          <Card className="h-56" />
        </div>
        <div className="md:col-span-5 space-y-6">
          <Card className="h-56" />
          <Card className="h-64" />
        </div>
      </PageGrid>
    </>
  )
}

export function AnalyticsSkeleton() {
  return (
    <>
      <PageGrid>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="md:col-span-4">
            <Card className="h-28" />
          </div>
        ))}
      </PageGrid>
      <PageGrid>
        <div className="md:col-span-6">
          <Card className="h-72" />
        </div>
        <div className="md:col-span-6">
          <Card className="h-72" />
        </div>
      </PageGrid>
      <Card className="h-64" />
    </>
  )
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
      {Array.from({ length: 5 }).map((_, col) => (
        <div key={col} className="w-[280px] shrink-0 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-3 rounded-xl bg-muted/30 p-3">
            {Array.from({ length: col === 0 ? 3 : 2 }).map((_, i) => (
              <Card key={i} className="h-28" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="h-24" />
      ))}
    </div>
  )
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      <Card className="h-32" />
      <div className="bg-card border border-border rounded-xl p-6">
        <PageGrid className="gap-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className={i < 2 ? 'md:col-span-12' : 'md:col-span-6'}>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </PageGrid>
      </div>
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <>
      <Card className="h-40" />
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <ListSkeleton rows={3} />
    </>
  )
}
