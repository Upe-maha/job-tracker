// src/app/api/user/accounts/[provider]/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { guard } from '@/lib/api/guard'
import { fail, serverError } from '@/lib/api/respond'
import { unlinkProviderFromUser } from '@/lib/dal/users'
import { OAUTH_PROVIDERS, type OAuthProvider } from '@/lib/schemas/enums'

// Step E. Disconnects a linked provider.
//
// The one refusal that matters is last_method: an OAuth-only account with a
// single link has no other way back in, and everything else in this step can be
// undone from the UI afterwards — that cannot.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  const { provider } = await params
  if (!(OAUTH_PROVIDERS as readonly string[]).includes(provider)) {
    return fail(404, 'Provider not found')
  }

  try {
    await connectDB()

    const result = await unlinkProviderFromUser({
      userId: g.session.user.id,
      provider: provider as OAuthProvider,
    })

    if (!result.ok) {
      if (result.reason === 'last_method') {
        return fail(
          400,
          'Set a password before disconnecting your only sign-in method.'
        )
      }
      // not_linked and no_user are both "there is nothing here to remove", and
      // a stale session should not be able to tell them apart.
      return fail(404, 'Provider not found')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError('user.accounts.DELETE', error)
  }
}
