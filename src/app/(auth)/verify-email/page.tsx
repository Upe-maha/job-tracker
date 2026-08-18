// src/app/(auth)/verify-email/page.tsx
'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { TokenRedeemer } from '@/components/auth/TokenRedeemer'
import { useVerifyEmail } from '@/hooks/useMutations'

// Reachable signed in or out: middleware treats only /login and /register as auth
// pages, so a signed-in user clicking the link lands here instead of losing the token.
function VerifyEmail() {
  const verify = useVerifyEmail()

  return (
    <TokenRedeemer
      title="Verify your email"
      pendingText="Verifying your email address..."
      redeem={verify.mutateAsync}
    >
      {(status) => (
        <div className="mt-4 space-y-2 text-sm">
          <Link href="/dashboard" className="text-ring hover:underline">
            Go to dashboard
          </Link>
          {status === 'error' && (
            <p className="text-muted-foreground">
              Links expire after 24 hours. Sign in and use the banner on your dashboard to send a
              new one.
            </p>
          )}
        </div>
      )}
    </TokenRedeemer>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthCard title="Verify your email">Loading...</AuthCard>}>
      <VerifyEmail />
    </Suspense>
  )
}
