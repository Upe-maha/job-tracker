// src/components/auth/TokenRedeemer.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ApiError } from '@/client/api-client'
import { AuthCard } from './AuthCard'

type Status = 'pending' | 'success' | 'error'

// /verify-email and /confirm-password-change differ only in copy and in which
// endpoint they call: both read ?token, POST it once, and report the outcome.
export function TokenRedeemer({
  title,
  pendingText,
  redeem,
  children,
}: {
  title: string
  pendingText: string
  redeem: (token: string) => Promise<{ message: string }>
  // Rendered under the message once the request settles, so each page can offer
  // the follow-up that makes sense for it.
  children?: (status: Status) => React.ReactNode
}) {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('pending')
  const [message, setMessage] = useState('')

  // Tokens are single-use and StrictMode double-invokes effects, so without this
  // guard the second call finds the token gone and reports "invalid or expired"
  // for a verification that just succeeded.
  const sent = useRef(false)

  useEffect(() => {
    // A missing token is decided during render below: setting state in an effect to
    // describe something already knowable from props costs an extra pass.
    if (!token || sent.current) return
    sent.current = true

    redeem(token)
      .then((res) => {
        setStatus('success')
        setMessage(res.message)
      })
      .catch((error: unknown) => {
        setStatus('error')
        setMessage(
          error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
        )
      })
    // The ref above is what enforces "run once"; redeem is not referentially
    // stable, so it is deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!token) {
    return (
      <AuthCard title={title}>
        <p className="text-destructive text-sm">
          This link is missing its token. Please use the link from your email.
        </p>
        {children?.('error')}
      </AuthCard>
    )
  }

  return (
    <AuthCard title={title}>
      {status === 'pending' ? (
        <p className="text-muted-foreground text-sm">{pendingText}</p>
      ) : (
        <p
          className={
            status === 'success'
              ? 'text-stage-offer-fg text-sm bg-stage-offer px-3 py-2 rounded-md'
              : 'text-destructive text-sm'
          }
        >
          {message}
        </p>
      )}

      {status !== 'pending' && children?.(status)}
    </AuthCard>
  )
}
