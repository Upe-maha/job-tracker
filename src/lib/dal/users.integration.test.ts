// src/lib/dal/users.integration.test.ts
//
// Step E's linking helpers, against a real mongod for the same reason
// tokens.integration.test.ts is: every property that matters here is a property
// of a MongoDB *query*, not of any JS predicate. $elemMatch matching one array
// element rather than two independently, the `$ne` guard that makes a
// concurrent link fail instead of appending a duplicate, `$pull` removing the
// right entry, and the unique partial index backing the in_use refusal — a
// mocked model can only assert the shape of a filter object, which passes just
// as happily when the semantics are wrong.
//
// It also pins resolveOAuthUser's *existing* sign-in behaviour as unchanged.
// Step E adds a second writer to the same accounts[] array, and the two answer
// deliberately different questions; if they ever have to converge, that should
// be a change with this file failing loudly, not a silent drift.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import User from '@/models/User'
import {
  linkProviderToUser,
  resolveOAuthUser,
  unlinkProviderFromUser,
} from './users'

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  // Index builds are asynchronous, and the partial unique index on
  // (accounts.provider, accounts.providerAccountId) is what makes "already
  // linked to someone else" an invariant rather than just a check.
  await User.init()
}, 60_000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

afterEach(async () => {
  await User.deleteMany({})
})

interface SeedArgs {
  email?: string
  password?: string
  accounts?: Array<{ provider: string; providerAccountId: string }>
}

async function seedUser({ email = 'ada@example.com', password, accounts = [] }: SeedArgs = {}) {
  return User.create({ name: 'Ada', email, password, accounts })
}

async function accountsOf(id: mongoose.Types.ObjectId) {
  const doc = await User.findById(id).select('accounts')
  return (doc!.accounts as Array<{ provider: string; providerAccountId: string }>).map(a => ({
    provider: a.provider,
    providerAccountId: a.providerAccountId,
  }))
}

describe('linkProviderToUser', () => {
  it('links a provider to the signed-in user regardless of the provider email', async () => {
    // The whole point of the helper: identity comes from the caller, not from
    // an email lookup, so a GitHub account on a different address still lands
    // on this user instead of resolving to (or creating) another one.
    const user = await seedUser({ email: 'ada@example.com' })

    const result = await linkProviderToUser({
      userId: user._id,
      provider: 'github',
      providerAccountId: 'gh-1',
    })

    expect(result.ok).toBe(true)
    expect(await accountsOf(user._id)).toEqual([
      { provider: 'github', providerAccountId: 'gh-1' },
    ])
    expect(await User.countDocuments()).toBe(1)
  })

  it('returns the account identity, so the caller does not rebuild a session from the provider profile', async () => {
    const user = await seedUser({ email: 'ada@example.com' })

    const result = await linkProviderToUser({
      userId: user._id,
      provider: 'github',
      providerAccountId: 'gh-1',
    })

    expect(result.ok && result.user.email).toBe('ada@example.com')
    expect(result.ok && result.user.name).toBe('Ada')
  })

  it('is idempotent for the same (provider, id) pair', async () => {
    const user = await seedUser()
    await linkProviderToUser({ userId: user._id, provider: 'github', providerAccountId: 'gh-1' })

    const again = await linkProviderToUser({
      userId: user._id,
      provider: 'github',
      providerAccountId: 'gh-1',
    })

    expect(again.ok).toBe(true)
    // A double-clicked Connect must not append a second entry.
    expect(await accountsOf(user._id)).toEqual([
      { provider: 'github', providerAccountId: 'gh-1' },
    ])
  })

  it('refuses a different account for an already-linked provider, leaving accounts untouched', async () => {
    // The decision this test exists for. Updating in place here — which is what
    // resolveOAuthUser does on the sign-in path — would silently rebind the
    // account to whichever GitHub happened to be signed into the browser.
    const user = await seedUser({
      accounts: [{ provider: 'github', providerAccountId: 'gh-1' }],
    })
    const before = await accountsOf(user._id)

    const result = await linkProviderToUser({
      userId: user._id,
      provider: 'github',
      providerAccountId: 'gh-2',
    })

    expect(result).toEqual({ ok: false, reason: 'provider_linked' })
    expect(await accountsOf(user._id)).toEqual(before)
  })

  it('refuses an account already linked to a different user', async () => {
    const owner = await seedUser({
      email: 'owner@example.com',
      accounts: [{ provider: 'github', providerAccountId: 'gh-1' }],
    })
    const other = await seedUser({ email: 'other@example.com' })

    const result = await linkProviderToUser({
      userId: other._id,
      provider: 'github',
      providerAccountId: 'gh-1',
    })

    expect(result).toEqual({ ok: false, reason: 'in_use' })
    expect(await accountsOf(other._id)).toEqual([])
    // And the link stays where it was — never moved.
    expect(await accountsOf(owner._id)).toEqual([
      { provider: 'github', providerAccountId: 'gh-1' },
    ])
  })

  it('does not match a mismatched (provider, id) pair across two array elements', async () => {
    // $elemMatch is load-bearing: two independent dot-notation conditions are
    // satisfied by *different* elements, which would report in_use here — and
    // for the same user, silently succeed as "already linked".
    const owner = await seedUser({
      email: 'owner@example.com',
      accounts: [
        { provider: 'google', providerAccountId: 'go-1' },
        { provider: 'github', providerAccountId: 'gh-1' },
      ],
    })
    const other = await seedUser({ email: 'other@example.com' })

    // (github, go-1) is a pair no user actually has.
    const result = await linkProviderToUser({
      userId: other._id,
      provider: 'github',
      providerAccountId: 'go-1',
    })

    expect(result.ok).toBe(true)
    expect(await accountsOf(other._id)).toEqual([
      { provider: 'github', providerAccountId: 'go-1' },
    ])
    expect(await accountsOf(owner._id)).toHaveLength(2)
  })

  it('reports no_user for an id that no longer exists', async () => {
    const result = await linkProviderToUser({
      userId: new mongoose.Types.ObjectId(),
      provider: 'github',
      providerAccountId: 'gh-1',
    })

    expect(result).toEqual({ ok: false, reason: 'no_user' })
  })

  it('never touches emailVerified', async () => {
    // A provider account whose address differs proves nothing about this
    // account's own address, so linking must not verify it.
    const user = await seedUser()
    expect((await User.findById(user._id))!.emailVerified).toBeNull()

    await linkProviderToUser({ userId: user._id, provider: 'github', providerAccountId: 'gh-1' })

    expect((await User.findById(user._id))!.emailVerified).toBeNull()
  })
})

describe('unlinkProviderFromUser', () => {
  it('removes only the named provider', async () => {
    const user = await seedUser({
      password: 'hashed',
      accounts: [
        { provider: 'google', providerAccountId: 'go-1' },
        { provider: 'github', providerAccountId: 'gh-1' },
      ],
    })

    const result = await unlinkProviderFromUser({ userId: user._id, provider: 'github' })

    expect(result).toEqual({ ok: true })
    expect(await accountsOf(user._id)).toEqual([
      { provider: 'google', providerAccountId: 'go-1' },
    ])
  })

  it('refuses to remove the last sign-in method of a passwordless account', async () => {
    const user = await seedUser({
      accounts: [{ provider: 'github', providerAccountId: 'gh-1' }],
    })

    const result = await unlinkProviderFromUser({ userId: user._id, provider: 'github' })

    expect(result).toEqual({ ok: false, reason: 'last_method' })
    expect(await accountsOf(user._id)).toHaveLength(1)
  })

  it('allows removing the only provider when a password exists', async () => {
    // password is select: false — reading the user without asking for it makes
    // every account look passwordless and refuses every disconnect.
    const user = await seedUser({
      password: 'hashed',
      accounts: [{ provider: 'github', providerAccountId: 'gh-1' }],
    })

    const result = await unlinkProviderFromUser({ userId: user._id, provider: 'github' })

    expect(result).toEqual({ ok: true })
    expect(await accountsOf(user._id)).toEqual([])
  })

  it('reports not_linked when the provider was never connected', async () => {
    const user = await seedUser({ password: 'hashed' })

    await expect(
      unlinkProviderFromUser({ userId: user._id, provider: 'google' }),
    ).resolves.toEqual({ ok: false, reason: 'not_linked' })
  })
})

// ─── Regression: the sign-in path is unchanged by Step E ──────────────
//
// resolveOAuthUser answers "who is signing in" from a provider-verified email.
// linkProviderToUser answers "attach this provider to the user already signed
// in". They are allowed to differ, and these pin both sides so the difference
// stays deliberate.
describe('resolveOAuthUser — unchanged by Step E', () => {
  it('still returns the owner of an already-linked pair', async () => {
    const user = await seedUser({
      accounts: [{ provider: 'github', providerAccountId: 'gh-1' }],
    })

    const resolved = await resolveOAuthUser({
      provider: 'github',
      providerAccountId: 'gh-1',
      email: 'someone-else@example.com', // ignored: the pair matched first
    })

    expect(resolved!._id.toString()).toBe(user._id.toString())
  })

  it('still merges onto a known email and verifies it', async () => {
    const user = await seedUser({ email: 'ada@example.com' })

    const resolved = await resolveOAuthUser({
      provider: 'github',
      providerAccountId: 'gh-1',
      email: 'ada@example.com',
    })

    expect(resolved!._id.toString()).toBe(user._id.toString())
    expect(resolved!.emailVerified).toBeInstanceOf(Date)
    expect(await accountsOf(user._id)).toEqual([
      { provider: 'github', providerAccountId: 'gh-1' },
    ])
  })

  it('still updates a provider id in place — the link path deliberately refuses this', async () => {
    const user = await seedUser({
      email: 'ada@example.com',
      accounts: [{ provider: 'github', providerAccountId: 'gh-1' }],
    })

    const resolved = await resolveOAuthUser({
      provider: 'github',
      providerAccountId: 'gh-2',
      email: 'ada@example.com',
    })

    expect(resolved!._id.toString()).toBe(user._id.toString())
    expect(await accountsOf(user._id)).toEqual([
      { provider: 'github', providerAccountId: 'gh-2' },
    ])

    // Same starting state, opposite answer, on purpose.
    await User.updateOne(
      { _id: user._id },
      { $set: { accounts: [{ provider: 'github', providerAccountId: 'gh-1' }] } },
    )
    await expect(
      linkProviderToUser({ userId: user._id, provider: 'github', providerAccountId: 'gh-2' }),
    ).resolves.toEqual({ ok: false, reason: 'provider_linked' })
  })

  it('still creates a user when the email is unknown', async () => {
    const resolved = await resolveOAuthUser({
      provider: 'google',
      providerAccountId: 'go-1',
      email: 'new@example.com',
      name: '  Grace  ',
    })

    expect(resolved!.name).toBe('Grace')
    expect(resolved!.emailVerified).toBeInstanceOf(Date)
    expect(await User.countDocuments()).toBe(1)
  })
})
