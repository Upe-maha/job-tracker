// src/app/api/user/password/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { guard } from '@/lib/api/guard'
import { parseBody } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'
import { passwordChangeSchema } from '@/lib/schemas/user'

export async function PUT(req: Request) {
  // This is an authenticated password oracle, so it gets the same 5/15min
  // budget as login — guard() keys it on the session user id.
  const g = await guard(req, { rateLimit: 'login' })
  if (!g.ok) return g.response

  // The schema applies the strength policy to newPassword only — currentPassword
  // is an existing secret, possibly created under an older rule — and rejects a
  // no-op change.
  const body = await parseBody(req, passwordChangeSchema)
  if (!body.ok) return body.response

  const { currentPassword, newPassword } = body.data

  try {
    await connectDB()
    const user = await User.findById(g.session.user.id).select('+password')
    if (!user) return fail(404, 'User not found')

    // OAuth-only accounts have no password (User.password is optional since
    // Step B). Without this, bcrypt.compare(x, undefined) throws and the
    // handler answers 500 instead of telling the caller what is wrong. No
    // enumeration concern — this is the caller's own authenticated account.
    if (!user.password) {
      return fail(400, 'This account has no password. Sign in with your linked provider instead.')
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) return fail(400, 'Current password is incorrect')

    const hashed = await bcrypt.hash(newPassword, 12)
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashed, passwordChangedAt: new Date() } }
    )

    return NextResponse.json({ message: 'Password updated' })
  } catch (error) {
    return serverError('user.password.PUT', error)
  }
}
