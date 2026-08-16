// src/app/api/auth/verify-email/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { guard } from '@/lib/api/guard'
import { parseBody } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'
import { consumeToken } from '@/lib/dal/tokens'
import { verifyTokenSchema } from '@/lib/schemas/auth'

// Public: the link is clicked from an email client, which carries no session.
// The token is the credential.
export async function POST(req: Request) {
  const g = await guard(req, { auth: false, rateLimit: 'token' })
  if (!g.ok) return g.response

  const body = await parseBody(req, verifyTokenSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const consumed = await consumeToken({ token: body.data.token, type: 'email_verify' })
    // One message for expired, already-used, wrong-type and never-existed.
    // Distinguishing them would tell an attacker which tokens were real.
    if (!consumed) return fail(400, 'This link is invalid or has expired')

    await User.updateOne({ _id: consumed.userId }, { $set: { emailVerified: new Date() } })

    return NextResponse.json({ message: 'Email verified' })
  } catch (error) {
    return serverError('auth.verifyEmail', error)
  }
}
