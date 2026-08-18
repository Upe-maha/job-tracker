// src/components/common/VerifyEmailBanner.tsx
'use client'

import { useState } from 'react'
import { MailCheck, MailWarning, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useResendVerification } from '@/hooks/useMutations'
import { useProfile } from '@/hooks/useQueries'
import { ApiError } from '@/client/api-client'

// Reads verification state from the existing ['profile'] query rather than the
// session. Putting emailVerified in the JWT would mean touching Step B's
// signIn/jwt callbacks and then dealing with a token that still says
// "unverified" until it refreshes; invalidating ['profile'] after a successful
// verify is what the rest of the app already does.
//
// OAuth users never see this: resolveOAuthUser sets emailVerified on every path
// it can return from.
export function VerifyEmailBanner() {
  const { data: user } = useProfile()
  const resend = useResendVerification()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !user || user.emailVerified) return null

  // The banner cannot disappear on a successful send — the address is still
  // unverified until the link is clicked — so it has to *say* something changed.
  // Without this it looked identical after sending, which reads as "nothing
  // happened" and invites another click; a few of those and the hourly budget
  // is gone and the next click answers 429.
  const sent = resend.isSuccess
  const error = resend.isError
    ? resend.error instanceof ApiError
      ? resend.error.message
      : 'Could not send the email. Please try again.'
    : ''

  return (
    <div
      className={`flex items-center gap-3 border-b border-border px-6 py-2 text-sm ${
        sent
          ? 'bg-stage-offer text-stage-offer-fg'
          : 'bg-stage-interview text-stage-interview-fg'
      }`}
    >
      {sent ? (
        <MailCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <MailWarning className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}

      <p className="flex-1">
        {sent
          ? 'Verification email sent — check your inbox for the link.'
          : error || 'Verify your email address to secure your account.'}
      </p>

      {/* Hidden once sent: there is nothing useful a second send can do, and
          offering the button is what turns one honest retry into four. */}
      {!sent && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => resend.mutate()}
          disabled={resend.isPending}
        >
          {resend.isPending ? 'Sending...' : error ? 'Try again' : 'Resend email'}
        </Button>
      )}

      {/* Dismissal is per page load on purpose — no localStorage. The prompt
          should come back until the address is actually verified. */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
