// src/components/profile/ConnectedAccounts.tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useDisconnectAccount, useStartLinkAccount } from '@/hooks/useMutations'
import { OAUTH_PROVIDER_LABELS } from '@/shared/display'
import { OAUTH_PROVIDERS } from '@/shared/schemas/enums'
import type { ILinkedAccount, OAuthProvider } from '@/types'
import ConfirmDeleteDialog from '@/components/common/ConfirmDeleteDialog'
import { GitHubMark, GoogleMark } from '@/components/common/ProviderMarks'
import { Button } from '@/components/ui/button'

// Connecting is two steps that cannot be collapsed: POST /api/user/link-account first,
// so a token proving *this* user started it waits in an httpOnly cookie, then hand off
// to next-auth. Without it the signIn callback resolves a user from the provider's
// email and silently swaps the session when that email differs.

export default function ConnectedAccounts({
  accounts,
}: {
  accounts: ILinkedAccount[]
}) {
  const startLink = useStartLinkAccount()
  const disconnect = useDisconnectAccount()
  const [pending, setPending] = useState<OAuthProvider | ''>('')
  const [confirming, setConfirming] = useState<OAuthProvider | null>(null)

  async function handleConnect(provider: OAuthProvider) {
    setPending(provider)
    try {
      await startLink.mutateAsync()
    } catch {
      // useStartLinkAccount toasts the reason. Do not redirect — without the
      // cookie the round trip would take the sign-in path instead.
      setPending('')
      return
    }
    signIn(provider, { callbackUrl: `/profile?linked=${provider}` })
  }

  async function handleDisconnect(provider: OAuthProvider) {
    await disconnect.mutateAsync(provider)
    setConfirming(null)
  }

  return (
    <div className="space-y-3">
      {OAUTH_PROVIDERS.map(provider => {
        const linked = accounts.find(a => a.provider === provider)
        const label = OAUTH_PROVIDER_LABELS[provider]

        return (
          <div
            key={provider}
            className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
          >
            {provider === 'github' ? <GitHubMark /> : <GoogleMark />}

            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm">{label}</p>
              <p className="text-muted-foreground text-xs truncate">
                {linked
                  ? `Connected ${format(new Date(linked.linkedAt), 'd MMM yyyy')}`
                  : 'Not connected'}
              </p>
            </div>

            {linked ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disconnect.isPending}
                onClick={() => setConfirming(provider)}
                className="text-destructive hover:bg-destructive/10 shrink-0"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending !== ''}
                onClick={() => handleConnect(provider)}
                className="border-border shrink-0 gap-2"
              >
                {pending === provider && <Loader2 className="w-3 h-3 animate-spin" />}
                {pending === provider ? 'Redirecting...' : 'Connect'}
              </Button>
            )}
          </div>
        )
      })}

      <ConfirmDeleteDialog
        open={confirming !== null}
        onOpenChange={open => !open && setConfirming(null)}
        title={`Disconnect ${confirming ? OAUTH_PROVIDER_LABELS[confirming] : ''}?`}
        description="You will no longer be able to sign in with this provider. Your account and data stay as they are."
        onConfirm={() => {
          if (confirming) void handleDisconnect(confirming)
        }}
        isPending={disconnect.isPending}
      />
    </div>
  )
}
