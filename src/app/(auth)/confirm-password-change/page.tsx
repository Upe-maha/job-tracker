// src/app/(auth)/confirm-password-change/page.tsx
'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { TokenRedeemer } from '@/components/auth/TokenRedeemer'
import { useConfirmPasswordChange } from '@/hooks/useMutations'

// The second half of the confirm-first change: until this page runs, the
// password on the account is still the old one.
function ConfirmPasswordChange() {
  const confirm = useConfirmPasswordChange()

  return (
    <TokenRedeemer
      title="Confirm password change"
      pendingText="Applying your new password..."
      redeem={confirm.mutateAsync}
    >
      {(status) => (
        <div className="mt-4 space-y-2 text-sm">
          <Link href="/login" className="text-ring hover:underline">
            Go to sign in
          </Link>
          {status === 'error' && (
            <p className="text-muted-foreground">
              Your password has not been changed. Start the change again from Settings.
            </p>
          )}
        </div>
      )}
    </TokenRedeemer>
  )
}

export default function ConfirmPasswordChangePage() {
  return (
    <Suspense fallback={<AuthCard title="Confirm password change">Loading...</AuthCard>}>
      <ConfirmPasswordChange />
    </Suspense>
  )
}
