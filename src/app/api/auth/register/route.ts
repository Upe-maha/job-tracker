// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { guard } from '@/lib/api/guard'
import { parseBody } from '@/lib/api/validate'
import { serverError } from '@/lib/api/respond'
import { issueToken } from '@/lib/dal/tokens'
import { sendMailSafe } from '@/lib/email/mailer'
import { accountExists, verifyEmail } from '@/lib/email/templates'
import { EMAIL_VERIFY_TTL_MS, registerSchema } from '@/lib/schemas/auth'

// One response for every outcome. Step A kept a clear 409 here and recorded the
// enumeration oracle as a known debt that "Step C's email verification is the
// real fix" for; this is that fix. Whether the address was free, already taken,
// or lost a concurrent insert race, the caller sees exactly this — the
// difference is carried entirely by which email arrives, which only the address
// owner can read.
const GENERIC = 'Check your inbox to finish setting up your account.'
const created = () => NextResponse.json({ message: GENERIC }, { status: 201 })

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
      // Tell the real owner that someone tried, and nobody else anything. The
      // mail carries no token and nothing that acts on the account, since the
      // person who typed the address may be a stranger who mistyped their own.
      await sendMailSafe({ to: existing.email, ...accountExists(existing.name) })
      return created()
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await User.create({ name, email, password: hashedPassword })

    const token = await issueToken({
      userId: user._id,
      type: 'email_verify',
      ttlMs: EMAIL_VERIFY_TTL_MS,
    })

    // sendMailSafe, not sendMail: a delivery failure must not turn into a 500
    // on this branch alone, or the oracle reopens through the error path —
    // break SMTP and the 500/201 split says whether the address was free. The
    // user can resend from the banner if the mail never arrives.
    await sendMailSafe({ to: user.email, ...verifyEmail(user.name, token) })

    return created()
  } catch (error: unknown) {
    // The check-then-create race: two concurrent registrations for the same
    // email both pass the findOne check and only one insert wins. The loser
    // answers the same 201 as everyone else — a 409 here would be the same
    // oracle by a narrower path.
    if ((error as { code?: number }).code === 11000) {
      return created()
    }
    return serverError('auth.register', error)
  }
}
