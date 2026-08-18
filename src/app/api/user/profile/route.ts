// src/app/api/user/profile/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/server/db'
import User from '@/models/User'
import { guard } from '@/server/http/guard'
import { parseBody } from '@/server/http/validate'
import { fail, serverError } from '@/server/http/respond'
import { profileUpdateSchema } from '@/shared/schemas/user'

// Never returned to the client: the hash, and the lockout counters that would
// tell an attacker with a stolen session how close the account is to locking.
const PRIVATE_FIELDS = '-password -failedLoginAttempts -lockUntil'

export async function GET(req: Request) {
  const g = await guard(req, { rateLimit: 'read' })
  if (!g.ok) return g.response

  try {
    await connectDB()
    const user = await User.findById(g.session.user.id).select(PRIVATE_FIELDS)
    if (!user) return fail(404, 'User not found')
    return NextResponse.json(user)
  } catch (error) {
    return serverError('profile.GET', error)
  }
}

export async function PUT(req: Request) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  // Replaces PROFILE_UPDATABLE + STRING_FIELDS + validateProfileUpdate (~80
  // lines). Zod's unknown-key stripping is what keeps email, password and the
  // lockout fields unwritable through this route; the avatar host allowlist
  // and the Cloudinary-only resume rule now come from @/shared/schemas/common
  // rather than a route-local copy that omitted the URL length cap.
  const body = await parseBody(req, profileUpdateSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()
    const user = await User.findByIdAndUpdate(
      g.session.user.id,
      { $set: body.data },
      { new: true, runValidators: true }
    ).select(PRIVATE_FIELDS)

    if (!user) return fail(404, 'User not found')
    return NextResponse.json(user)
  } catch (error) {
    return serverError('profile.PUT', error)
  }
}
