// src/app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { guard } from '@/lib/api/guard'
import { parseBody } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'
import { consumeToken } from '@/lib/dal/tokens'
import { resetPasswordSchema } from '@/lib/schemas/auth'

export async function POST(req: Request) {
  const g = await guard(req, { auth: false, rateLimit: 'token' })
  if (!g.ok) return g.response

  const body = await parseBody(req, resetPasswordSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const consumed = await consumeToken({ token: body.data.token, type: 'password_reset' })
    if (!consumed) return fail(400, 'This link is invalid or has expired')

    const hashed = await bcrypt.hash(body.data.password, 12)

    await User.updateOne(
      { _id: consumed.userId },
      {
        $set: {
          password: hashed,
          passwordChangedAt: new Date(),
          // Clicking a link in the inbox proves control of the address, so this
          // verifies it too — otherwise a user who reset before verifying would
          // still be nagged by the banner for no reason.
          emailVerified: new Date(),
          // Same reasoning auth.ts gives for OAuth: inbox control is stronger
          // evidence of ownership than a password, and leaving the lockout in
          // place would let an attacker's failed guessing deny the real owner
          // their own account.
          failedLoginAttempts: 0,
          lockUntil: null,
        },
      }
    )

    return NextResponse.json({ message: 'Password updated. You can sign in now.' })
  } catch (error) {
    return serverError('auth.resetPassword', error)
  }
}
