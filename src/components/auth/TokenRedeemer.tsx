// src/components/auth/TokenRedeemer.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ApiError } from '@/lib/api-client'
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

  // Tokens are single-use, so this effect must fire exactly once. React's
  // StrictMode double-invokes effects in development: without this guard the
  // first call would consume the token, the second would find it gone, and the
  // page would show "invalid or expired" for a verification that had in fact
  // just succeeded.
  const sent = useRef(false)

  useEffect(() => {
    // A missing token is decided during render below, not here — setting state
    // synchronously in an effect just to describe something already knowable
    // from props costs an extra render pass.
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
    // redeem comes from a mutation hook and is not referentially stable; the
    // ref above is what actually enforces "run once", so it is deliberately not
    // a dependency.
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
