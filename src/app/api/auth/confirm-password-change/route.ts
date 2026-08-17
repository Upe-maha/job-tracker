// src/app/api/auth/confirm-password-change/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { guard } from '@/lib/api/guard'
import { parseBody } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'
import { consumeToken } from '@/lib/dal/tokens'
import { restampSession } from '@/lib/security/sessionCookie'
import { verifyTokenSchema } from '@/lib/schemas/auth'

// The second half of the confirm-first password change. PUT /api/user/password
// only stored the new hash on the token; this is where it lands on the user.
//
// Public because the link is clicked from an email, possibly on a different
// device than the one that started the change.
export async function POST(req: Request) {
  const g = await guard(req, { auth: false, rateLimit: 'token' })
  if (!g.ok) return g.response

  const body = await parseBody(req, verifyTokenSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const consumed = await consumeToken({ token: body.data.token, type: 'password_change' })
    if (!consumed) return fail(400, 'This link is invalid or has expired')

    // A password_change token with no hash means the issue path or the
    // projection is broken. Writing `undefined` here would blank the user's
    // password and lock them out of their own account, so this is a 500 to be
    // read in the logs, never a write.
    if (!consumed.pendingPassword) {
      return serverError(
        'auth.confirmPasswordChange',
        new Error('password_change token carried no pendingPassword')
      )
    }

    await User.updateOne(
      { _id: consumed.userId },
      {
        $set: {
          password: consumed.pendingPassword,
          passwordChangedAt: new Date(),
          // Confirming from the inbox clears any lockout, for the same reason
          // reset-password does.
          failedLoginAttempts: 0,
          lockUntil: null,
        },
      }
    )

    // Step I. passwordChangedAt above revokes every session signed in before
    // it — including this one, which is the tab the user is looking at. Their
    // own cookie is re-issued with a fresh signedInAt so the roadmap's "all
    // *other* sessions logged out" is true as written.
    //
    // Only ever the acting user's own session, and only if this request
    // carries one: the emailed link may well have been opened on another
    // device, or while signed out, and neither case has anything to re-stamp.
    const res = NextResponse.json({ message: 'Password changed' })
    await restampSession(req, res, consumed.userId.toString())
    return res
  } catch (error) {
    return serverError('auth.confirmPasswordChange', error)
  }
}
