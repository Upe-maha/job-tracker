// src/server/data/tokens.ts
import crypto from 'node:crypto'
import mongoose from 'mongoose'
import Token from '@/models/Token'
import type { TokenType } from '@/shared/schemas/enums'

// Kept free of next-auth and next/server imports, like the rest of the DAL —
// that is what lets the integration test drive these against a real mongod
// without booting NextAuth or building a Response.

// 32 bytes of CSPRNG output. base64url so it survives a query string untouched;
// the fixed 43-char length is what src/shared/schemas/auth.ts validates against.
export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

interface IssueTokenArgs {
  userId: string | mongoose.Types.ObjectId
  type: TokenType
  ttlMs: number
  pendingPassword?: string
}

// Returns the raw token — the only moment it exists outside the email.
//
// One upsert, not delete-then-insert. Delete-then-insert leaves a window where
// two concurrent resends both insert and the user ends up with two live links;
// the { userId, type } unique index plus this upsert means whichever write
// lands last owns the single surviving document, whatever the interleaving.
//
// Semantics are last-write-wins: two resends fired in the same instant produce
// two emails of which only the later link works. Sequential resends — the case
// that actually happens — always invalidate the previous link.
export async function issueToken({
  userId,
  type,
  ttlMs,
  pendingPassword,
}: IssueTokenArgs): Promise<string> {
  const raw = generateToken()
  const update = {
    $set: {
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttlMs),
      pendingPassword: pendingPassword ?? null,
    },
  }

  try {
    await Token.findOneAndUpdate({ userId, type }, update, { upsert: true })
  } catch (err: unknown) {
    // Two concurrent upserts can both attempt the insert; one loses on the
    // unique index. Retry once — the document exists now. Same pattern as
    // checkRateLimit and resolveOAuthUser.
    if ((err as { code?: number }).code === 11000) {
      await Token.findOneAndUpdate({ userId, type }, update, { upsert: true })
    } else {
      throw err
    }
  }

  return raw
}

export interface ConsumedToken {
  userId: mongoose.Types.ObjectId
  type: TokenType
  pendingPassword: string | null
}

// Single-use by construction: findOneAndDelete is atomic, so a double-clicked
// link finds nothing the second time.
//
// Both `type` and the expiry live in the *filter*, deliberately:
//   - `type` is a security boundary. Without it a password_reset token would
//     satisfy verify-email and be redeemable for a capability it was never
//     issued for.
//   - `expiresAt: { $gt: now }` is what actually enforces expiry. The TTL index
//     is garbage collection and runs on Mongo's own schedule, so an expired
//     token is routinely still present in the collection.
//
// pendingPassword is select: false, so it has to be asked for explicitly —
// without this the password_change confirmation would write `undefined` over
// the user's password and lock them out of their own account. Selected
// unconditionally rather than behind a type check: one code path, and the
// field is null for the other two types anyway.
export async function consumeToken({
  token,
  type,
}: {
  token: string
  type: TokenType
}): Promise<ConsumedToken | null> {
  const doc = await Token.findOneAndDelete({
    tokenHash: hashToken(token),
    type,
    expiresAt: { $gt: new Date() },
  }).select('+pendingPassword')

  if (!doc) return null

  return {
    userId: doc.userId,
    type: doc.type,
    pendingPassword: doc.pendingPassword ?? null,
  }
}
