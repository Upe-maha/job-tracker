// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { guard } from '@/lib/api/guard'
import { parseBody } from '@/lib/api/validate'
import { serverError } from '@/lib/api/respond'
import { issueToken } from '@/lib/dal/tokens'
import { sendMailSafe } from '@/lib/email/mailer'
import { passwordReset } from '@/lib/email/templates'
import { forgotPasswordSchema, PASSWORD_RESET_TTL_MS } from '@/shared/schemas/auth'

// The same answer whether or not the address has an account — anything else is
// an account-enumeration oracle, and this endpoint is unauthenticated.
const GENERIC = 'If that address has an account, a reset link is on its way.'

export async function POST(req: Request) {
  // IP-keyed (no session), 5/hour. Bounds how much mail one client can cause.
  const g = await guard(req, { auth: false, rateLimit: 'reset' })
  if (!g.ok) return g.response

  const body = await parseBody(req, forgotPasswordSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const user = await User.findOne({ email: body.data.email })

    if (user) {
      const token = await issueToken({
        userId: user._id,
        type: 'password_reset',
        ttlMs: PASSWORD_RESET_TTL_MS,
      })

      // sendMailSafe, not sendMail. A send failure here must not become a 500,
      // because the no-such-user branch below cannot fail the same way — the
      // difference would tell the caller the address is real. An OAuth-only
      // user (no password) gets a link too: that sets a first password, and the
      // address was provider-verified when the account was linked.
      await sendMailSafe({ to: user.email, ...passwordReset(user.name, token) })

      // Deliberately NOT refunding on a failed send, unlike resend-verification.
      // A send is only attempted when the account exists, so refunding when it
      // fails would mean real addresses get charged and unknown ones don't —
      // and an attacker reads that difference off the 429: five probes at an
      // address that never rate-limits you is an address with no account.
      // Charging uniformly for every request is what keeps the two branches
      // indistinguishable.
    }

    return NextResponse.json({ message: GENERIC })
  } catch (error) {
    return serverError('auth.forgotPassword', error)
  }
}
