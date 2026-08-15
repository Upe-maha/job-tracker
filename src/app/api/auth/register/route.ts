// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { guard } from '@/lib/api/guard'
import { parseBody } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'
import { registerSchema } from '@/lib/schemas/auth'

export async function POST(req: Request) {
  // IP-keyed on purpose: keying this on email instead would let an attacker
  // exhaust a victim's registration budget rather than their own.
  const g = await guard(req, { auth: false, rateLimit: 'register' })
  if (!g.ok) return g.response

  // The schema trims and lowercases the email and trims the name, so the
  // values below are already in the shape the User model stores.
  const body = await parseBody(req, registerSchema)
  if (!body.ok) return body.response

  const { email, name, password } = body.data

  try {
    await connectDB()

    const existing = await User.findOne({ email })
    if (existing) {
      return fail(409, 'Account with this Email already in use')
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await User.create({ name, email, password: hashedPassword })

    return NextResponse.json(
      { message: 'Account created successfully', userName: user.name },
      { status: 201 }
    )
  } catch (error: unknown) {
    // Closes the check-then-create race: two concurrent registrations for
    // the same email both pass the findOne check, but only one insert wins.
    if ((error as { code?: number }).code === 11000) {
      return fail(409, 'Account with this Email already in use')
    }
    return serverError('auth.register', error)
  }
}
