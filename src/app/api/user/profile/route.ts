// src/app/api/user/profile/route.ts
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import { guard } from '@/lib/api/guard'
import { readJsonBody, pickAllowed } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'

const PROFILE_UPDATABLE = [
  'name', 'bio', 'location', 'phone', 'linkedIn', 'portfolio',
  'currency', 'jobSearchStatus', 'photo', 'resume',
] as const

const STRING_FIELDS: Record<string, { max: number; min?: number }> = {
  name: { max: 100, min: 1 },
  bio: { max: 1000 },
  location: { max: 200 },
  phone: { max: 30 },
  linkedIn: { max: 200 },
  portfolio: { max: 200 },
}

const JOB_SEARCH_STATUSES = ['actively_looking', 'open', 'not_looking']
const CURRENCY_RE = /^[A-Z]{3}$/

// photo/resume only ever come from our own /api/upload -> Cloudinary, so
// anything else (e.g. "javascript:alert(1)") is rejected. Empty string is
// allowed, to let a user clear their photo/resume.
function isCloudinaryUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com'
  } catch {
    return false
  }
}

function validateProfileUpdate(
  picked: Partial<Record<(typeof PROFILE_UPDATABLE)[number], unknown>>
): { ok: true; update: Record<string, unknown> } | { ok: false; message: string } {
  const update: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(picked)) {
    if (key in STRING_FIELDS) {
      const { max, min = 0 } = STRING_FIELDS[key]
      if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
        return { ok: false, message: `Invalid value for ${key}` }
      }
      update[key] = value.trim()
      continue
    }

    if (key === 'currency') {
      if (typeof value !== 'string' || !CURRENCY_RE.test(value)) {
        return { ok: false, message: 'Invalid currency' }
      }
      update[key] = value
      continue
    }

    if (key === 'jobSearchStatus') {
      if (typeof value !== 'string' || !JOB_SEARCH_STATUSES.includes(value)) {
        return { ok: false, message: 'Invalid job search status' }
      }
      update[key] = value
      continue
    }

    if (key === 'photo' || key === 'resume') {
      if (typeof value !== 'string' || (value !== '' && !isCloudinaryUrl(value))) {
        return { ok: false, message: `Invalid value for ${key}` }
      }
      update[key] = value
      continue
    }
  }

  return { ok: true, update }
}

export async function GET(req: Request) {
  const g = await guard(req)
  if (!g.ok) return g.response

  try {
    await connectDB()
    const user = await User.findById(g.session.user.id).select('-password -failedLoginAttempts -lockUntil')
    if (!user) return fail(404, 'User not found')
    return NextResponse.json(user)
  } catch (error) {
    return serverError('profile.GET', error)
  }
}

export async function PUT(req: Request) {
  const g = await guard(req)
  if (!g.ok) return g.response

  const body = await readJsonBody(req)
  if (!body.ok) return body.response

  const picked = pickAllowed(body.data, PROFILE_UPDATABLE)
  const validated = validateProfileUpdate(picked)
  if (!validated.ok) return fail(400, validated.message)
  if (Object.keys(validated.update).length === 0) return fail(400, 'No valid fields to update')

  try {
    await connectDB()
    const user = await User.findByIdAndUpdate(
      g.session.user.id,
      { $set: validated.update },
      { new: true, runValidators: true }
    ).select('-password -failedLoginAttempts -lockUntil')

    if (!user) return fail(404, 'User not found')
    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return fail(400, 'Invalid field value')
    }
    return serverError('profile.PUT', error)
  }
}
