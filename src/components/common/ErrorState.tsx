// src/components/common/ErrorState.tsx
'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-client'

// Before this existed, no page handled a failed query at all: the dashboard
// and analytics pages tested `isLoading || !data`, so when a request failed
// `isLoading` went false while `data` stayed undefined and the page showed
// "Loading..." forever with no way to recover.
export default function ErrorState({
  error,
  onRetry,
  isRetrying,
}: {
  error: unknown
  onRetry?: () => void
  isRetrying?: boolean
}) {
  const status = error instanceof ApiError ? error.status : undefined

  // A network failure and a 500 are the same to the user — "try again". A 401
  // means the session lapsed, and retrying will not help.
  const message =
    status === 401
      ? 'Your session has expired. Sign in again to continue.'
      : status === 404
        ? "We couldn't find that."
        : error instanceof ApiError
          ? error.message
          : "Couldn't reach the server. Check your connection and try again."

  return (
    <div
      role="alert"
      className="
        border border-dashed border-destructive/30 bg-destructive/5
        rounded-xl flex flex-col items-center justify-center
        gap-3 py-12 px-6 text-center
      "
    >
      <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">Something went wrong</p>
        <p className="text-muted-foreground text-sm max-w-sm">{message}</p>
      </div>
      {onRetry && status !== 401 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="gap-2 border-border"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Try again'}
        </Button>
      )}
    </div>
  )
}
