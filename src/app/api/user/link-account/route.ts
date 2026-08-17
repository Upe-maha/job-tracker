// src/app/api/user/link-account/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { guard } from '@/lib/api/guard'
import { serverError } from '@/lib/api/respond'
import { issueToken } from '@/lib/dal/tokens'
import { accountLinkCookie, ACCOUNT_LINK_TTL_MS } from '@/lib/security/linkIntent'

// Step E, step 1 of connecting a provider to the signed-in account.
//
// All this does is record intent: an account_link token issued to *this* user,
// handed back in an httpOnly cookie. The client then starts the normal OAuth
// round trip, and the signIn callback in @/lib/auth reads the cookie to learn
// which user the resulting provider account belongs to — instead of resolving
// one from the provider's email, which is what would silently swap the session
// when the two addresses differ.
//
// The token is the proof, not the cookie: it is single-use, type-scoped and
// expiring, all enforced inside consumeToken's filter. The cookie is only how
// it gets carried across the redirect.
export async function POST(req: Request) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  try {
    await connectDB()

    const token = await issueToken({
      userId: g.session.user.id,
      type: 'account_link',
      ttlMs: ACCOUNT_LINK_TTL_MS,
    })

    // issueToken upserts on { userId, type }, so pressing Connect twice
    // invalidates the first attempt rather than leaving two live tokens.
    const res = NextResponse.json({ ok: true })
    res.cookies.set(accountLinkCookie(token))
    return res
  } catch (error) {
    return serverError('user.linkAccount.POST', error)
  }
}
