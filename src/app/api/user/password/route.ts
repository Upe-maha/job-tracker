// src/app/api/user/password/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { guard } from '@/lib/api/guard'
import { readJsonBody } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'
import { validatePassword } from '@/lib/security/sanitize'

export async function PUT(req: Request) {
  // This is an authenticated password oracle, so it gets the same 5/15min
  // budget as login — guard() keys it on the session user id.
  const g = await guard(req, { rateLimit: 'login' })
  if (!g.ok) return g.response

  const body = await readJsonBody(req)
  if (!body.ok) return body.response

  const { currentPassword, newPassword } = body.data

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return fail(400, 'Both fields are required')
  }

  const passwordCheck = validatePassword(newPassword)
  if (!passwordCheck.valid) {
    return fail(400, passwordCheck.message ?? 'Invalid password')
  }

  if (newPassword === currentPassword) {
    return fail(400, 'New password must be different from the current password')
  }

  try {
    await connectDB()
    const user = await User.findById(g.session.user.id).select('+password')
    if (!user) return fail(404, 'User not found')

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
