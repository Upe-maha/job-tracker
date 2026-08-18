// src/server/data/users.ts
import type mongoose from 'mongoose'
import User from '@/models/User'
import { isAllowedImageUrl } from '@/shared/security/sanitize'
import type { OAuthProvider } from '@/shared/schemas/enums'

// Kept free of next-auth imports on purpose: this is the security-critical
// half of Step B, and it must be callable from a test without booting NextAuth.

interface VerifiedEmailArgs {
  provider: OAuthProvider
  accessToken?: string | null
  profileEmail?: string | null
  profileEmailVerified?: boolean
}

// Only an email the provider itself vouches for may be auto-linked to an
// existing account. Without this, anyone could register at a provider using a
// victim's address and inherit their job tracker — the exact attack NextAuth's
// default OAuthAccountNotLinked block prevents, and which Step B bypasses in
// order to merge accounts gracefully.
export async function verifiedProviderEmail({
  provider,
  accessToken,
  profileEmail,
  profileEmailVerified,
}: VerifiedEmailArgs): Promise<string | null> {
  if (provider === 'google') {
    // Google is an OIDC provider and asserts this claim directly.
    return profileEmailVerified === true && profileEmail
      ? profileEmail.toLowerCase().trim()
      : null
  }

  if (provider === 'github') {
    // The built-in GitHub provider only calls /user/emails when the public
    // profile email is empty, and then takes `primary` *without* checking
    // `verified` (providers/github.js). So ask for ourselves.
    if (!accessToken) return null

    const res = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    })
    if (!res.ok) return null

    const emails: Array<{ email: string; primary: boolean; verified: boolean }> = await res.json()
    const match = emails.find(e => e.primary && e.verified)
    return match ? match.email.toLowerCase().trim() : null
  }

  return null
}

interface ResolveOAuthUserArgs {
  provider: OAuthProvider
  providerAccountId: string
  email: string // must already be provider-verified
  name?: string | null
  image?: string | null
}

// Find-or-link-or-create, in that order. Callers must pass an email that has
// already been through verifiedProviderEmail.
export async function resolveOAuthUser({
  provider,
  providerAccountId,
  email,
  name,
  image,
}: ResolveOAuthUserArgs) {
  const link = { provider, providerAccountId, linkedAt: new Date() }

  // 1. Returning user — this provider account is already linked.
  //
  //    $elemMatch is load-bearing. Two independent dot-notation conditions
  //    (`{'accounts.provider': p, 'accounts.providerAccountId': id}`) are
  //    satisfied by *different* array elements, so a user linked to
  //    [{google, A}, {github, B}] would match the pair (github, A) — a
  //    mismatched provider/id combination resolving to the wrong account.
  const byAccount = await User.findOne({
    accounts: { $elemMatch: { provider, providerAccountId } },
  })
  if (byAccount) return byAccount

  // 2. Known email — attach this provider to the existing account. This is the
  //    "registered with a password, now signing in with Google" merge, safe
  //    only because the email is verified.
  //
  //    Split in two so the array can never accumulate a second entry for one
  //    provider: if this provider is already linked (to a different id, which
  //    step 1 didn't match), its id is updated in place; otherwise the link is
  //    appended, guarded by $ne so a concurrent sign-in can't duplicate it.
  const relinked = await User.findOneAndUpdate(
    { email, accounts: { $elemMatch: { provider } } },
    {
      $set: {
        'accounts.$.providerAccountId': providerAccountId,
        'accounts.$.linkedAt': link.linkedAt,
        emailVerified: new Date(),
      },
    },
    { new: true, runValidators: true }
  )
  if (relinked) return relinked

  const linked = await User.findOneAndUpdate(
    { email, 'accounts.provider': { $ne: provider } },
    { $push: { accounts: link }, $set: { emailVerified: new Date() } },
    { new: true, runValidators: true }
  )
  if (linked) return linked

  // 3. Brand-new user. No password — provider-only until its owner sets one.
  try {
    return await User.create({
      name: name?.trim() || email.split('@')[0],
      email,
      emailVerified: new Date(),
      photo: isAllowedImageUrl(image ?? '') ? (image ?? '') : '',
      accounts: [link],
    })
  } catch (err: unknown) {
    // Two concurrent first sign-ins race on the unique email index; the loser
    // re-reads the winner's document. Same pattern as auth/register/route.ts.
    if ((err as { code?: number }).code === 11000) {
      return await User.findOne({ email })
    }
    throw err
  }
}

// Step I. The one read the session policy needs, kept as small as it can be:
// it runs on the critical path of any request whose revalidation window has
// elapsed, so it must never grow into "load the user".
//
// `null` for a user that no longer exists is meaningful, not an error — the
// caller ends the session on it, so a deleted account cannot keep a live token.
export async function fetchSessionUser(
  userId: string | mongoose.Types.ObjectId,
): Promise<{ passwordChangedAt: Date | null } | null> {
  const user = await User.findById(userId).select('passwordChangedAt').lean<{
    passwordChangedAt?: Date | null
  }>()

  if (!user) return null
  return { passwordChangedAt: user.passwordChangedAt ?? null }
}

interface LinkProviderArgs {
  userId: string | mongoose.Types.ObjectId
  provider: OAuthProvider
  providerAccountId: string
}

// The identity fields come back on success because the caller needs them: the
// signIn callback is minting a fresh JWT, and without them the session would be
// rebuilt from the *provider's* profile — the linked GitHub account's name and
// email would replace the ones on the job-tracker account.
export interface LinkedIdentity {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  photo?: string
}

export type LinkProviderResult =
  | { ok: true; user: LinkedIdentity }
  | { ok: false; reason: 'in_use' | 'provider_linked' | 'no_user' }

const IDENTITY_FIELDS = 'name email photo'

// Step E. Attaches a provider to an *already-authenticated* user, which is a
// different question from the one resolveOAuthUser answers.
//
// resolveOAuthUser identifies a user from a provider-verified email — find,
// link-by-email, or create. Pointing that at a Connect button is the bug this
// function exists to avoid: when the provider's email differs from the account's
// (common, and exactly the case Connect serves) it resolves to a *different*
// user, and the signIn callback then overwrites user.id with that user's _id —
// the session silently becomes someone else's. So identity here comes from the
// caller (an account_link token issued to the signed-in user) and the email is
// never consulted. emailVerified is likewise untouched: a GitHub account whose
// address differs proves nothing about this account's own address.
//
// Written for its one caller. No abstraction over providers beyond the union
// that already exists — the day a third provider needs linking is the day to
// find out what it needs.
export async function linkProviderToUser({
  userId,
  provider,
  providerAccountId,
}: LinkProviderArgs): Promise<LinkProviderResult> {
  // $elemMatch for the same reason resolveOAuthUser uses it: two dot-notation
  // conditions can be satisfied by different array elements, which would treat
  // a mismatched (provider, id) pair as a match.
  const owner = await User.findOne({
    accounts: { $elemMatch: { provider, providerAccountId } },
  }).select(IDENTITY_FIELDS)

  if (owner) {
    // Already ours — a double-clicked Connect is not an error.
    if (owner._id.toString() === userId.toString()) return { ok: true, user: owner }
    // Someone else's. Never move a link and never switch sessions; the unique
    // partial index on (accounts.provider, accounts.providerAccountId) is what
    // makes this an invariant rather than just a check.
    return { ok: false, reason: 'in_use' }
  }

  // Deliberately NOT an update-in-place, which is what resolveOAuthUser does on
  // the sign-in path. Rebinding here would mean that connecting while a
  // different GitHub account happens to be signed into the browser silently
  // swaps which account is attached, leaving no record of the previous one and
  // never asking. Disconnect, then Connect. Replacing a linked account is a
  // distinct operation and should be named as one if it is ever wanted.
  //
  // The $ne guard is also what makes this safe under a concurrent link: the
  // loser matches nothing and reports provider_linked rather than appending a
  // second entry for one provider.
  const updated = await User.findOneAndUpdate(
    { _id: userId, 'accounts.provider': { $ne: provider } },
    { $push: { accounts: { provider, providerAccountId, linkedAt: new Date() } } },
    { new: true, runValidators: true }
  ).select(IDENTITY_FIELDS)

  if (updated) return { ok: true, user: updated }

  // Nothing matched: either this user already has a different account id for
  // this provider, or the user id itself is bad. Distinguished with one cheap
  // read so a stale session reports something truthful.
  const exists = await User.exists({ _id: userId })
  return { ok: false, reason: exists ? 'provider_linked' : 'no_user' }
}

// Step E. Removes a link, refusing when it is the account's last way back in —
// no password and this is the only linked provider. Everything else in this
// step is undoable from the UI; that is not.
export async function unlinkProviderFromUser({
  userId,
  provider,
}: {
  userId: string | mongoose.Types.ObjectId
  provider: OAuthProvider
}): Promise<
  { ok: true } | { ok: false; reason: 'no_user' | 'not_linked' | 'last_method' }
> {
  // password is select: false, so it has to be asked for explicitly — without
  // it every account looks passwordless and every disconnect gets refused.
  const user = await User.findById(userId).select('+password accounts')
  if (!user) return { ok: false, reason: 'no_user' }

  const accounts: Array<{ provider: OAuthProvider }> = user.accounts ?? []
  if (!accounts.some(a => a.provider === provider)) {
    return { ok: false, reason: 'not_linked' }
  }
  if (!user.password && accounts.length <= 1) {
    return { ok: false, reason: 'last_method' }
  }

  await User.updateOne({ _id: user._id }, { $pull: { accounts: { provider } } })
  return { ok: true }
}
