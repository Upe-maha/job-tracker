// src/lib/dal/users.ts
import User from '@/models/User'
import { isAllowedImageUrl } from '@/lib/security/sanitize'
import type { OAuthProvider } from '@/lib/schemas/enums'

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
