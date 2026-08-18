// src/app/api/auth/resend-verification/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/server/db'
import User from '@/models/User'
import { guard } from '@/server/http/guard'
import { fail, serverError } from '@/server/http/respond'
import { issueToken } from '@/server/data/tokens'
import { sendMail } from '@/server/email/mailer'
import { verifyEmail } from '@/server/email/templates'
import { EMAIL_VERIFY_TTL_MS } from '@/shared/schemas/auth'

// Authenticated, so there is no address to enumerate here — the session decides
// who gets the mail, and the request body is ignored entirely. That also means
// a send failure can surface honestly as a 500, unlike register/forgot-password.
//
// 'reset' (5/hour), not 'token': this *sends*, and guard() keys it on the
// session user id, so one account cannot be used to flood an inbox.
export async function POST(req: Request) {
  const g = await guard(req, { rateLimit: 'reset' })
  if (!g.ok) return g.response

  try {
    await connectDB()

    const user = await User.findById(g.session.user.id)
    if (!user) return fail(404, 'User not found')

    // Already verified — including every OAuth user, whom resolveOAuthUser
    // verifies at sign-in. Answer success rather than an error: the caller
    // asked for a verified address and has one.
    //
    // Refund first. The 'reset' budget exists to bound outbound mail, and this
    // branch sends none, so charging for it would let a user burn their real
    // resend allowance on requests that never produced an email.
    if (user.emailVerified) {
      await g.refund()
      return NextResponse.json({ message: 'Your email is already verified' })
    }

    const token = await issueToken({
      userId: user._id,
      type: 'email_verify',
      ttlMs: EMAIL_VERIFY_TTL_MS,
    })

    try {
      await sendMail({ to: user.email, ...verifyEmail(user.name, token) })
    } catch (err) {
      // Nothing was delivered, so nothing should have been charged. Without
      // this, a misconfigured or down mail provider burns the user's whole
      // hourly allowance on 500s — they click, get an error, click again, and
      // by the time delivery is fixed they are rate limited out of the feature.
      //
      // Safe here precisely because the route is authenticated: the refund
      // depends only on whether mail left, never on whether some *other*
      // account exists. forgot-password deliberately does not do this — see the
      // note there.
      await g.refund()
      throw err
    }

    return NextResponse.json({ message: 'Verification email sent' })
  } catch (error) {
    return serverError('auth.resendVerification', error)
  }
}
