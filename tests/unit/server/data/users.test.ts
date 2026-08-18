// tests/unit/server/data/users.test.ts
//
// verifiedProviderEmail is the control that replaces NextAuth's default
// OAuthAccountNotLinked block, so its failure mode is account takeover: anyone
// who registers at a provider with a victim's address inherits their tracker.
// It is pure apart from one fetch, which is why it lives in the DAL free of
// next-auth imports — that is what makes this file possible.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifiedProviderEmail } from '@/server/data/users'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubGithubEmails(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('verifiedProviderEmail — google', () => {
  const google = { provider: 'google' as const }

  it('accepts an email the OIDC claim vouches for, normalized', () => {
    return expect(
      verifiedProviderEmail({
        ...google,
        profileEmail: '  Ada@Example.COM ',
        profileEmailVerified: true,
      }),
    ).resolves.toBe('ada@example.com')
  })

  it('refuses when email_verified is absent or false', async () => {
    await expect(
      verifiedProviderEmail({ ...google, profileEmail: 'ada@example.com' }),
    ).resolves.toBeNull()
    await expect(
      verifiedProviderEmail({
        ...google,
        profileEmail: 'ada@example.com',
        profileEmailVerified: false,
      }),
    ).resolves.toBeNull()
  })

  // Guards against a truthy-but-not-true claim being accepted.
  it('refuses a non-boolean truthy email_verified', async () => {
    await expect(
      verifiedProviderEmail({
        ...google,
        profileEmail: 'ada@example.com',
        profileEmailVerified: 'yes' as unknown as boolean,
      }),
    ).resolves.toBeNull()
  })

  it('refuses when no email is supplied', async () => {
    await expect(
      verifiedProviderEmail({ ...google, profileEmailVerified: true }),
    ).resolves.toBeNull()
  })
})

describe('verifiedProviderEmail — github', () => {
  const github = { provider: 'github' as const, accessToken: 'tok' }

  it('takes the primary verified address', async () => {
    stubGithubEmails(200, [
      { email: 'other@example.com', primary: false, verified: true },
      { email: 'Ada@Example.com', primary: true, verified: true },
    ])
    await expect(verifiedProviderEmail(github)).resolves.toBe('ada@example.com')
  })

  // The built-in GitHub provider takes `primary` WITHOUT checking `verified`,
  // which is the entire reason this function exists.
  it('refuses a primary address that is not verified', async () => {
    stubGithubEmails(200, [{ email: 'ada@example.com', primary: true, verified: false }])
    await expect(verifiedProviderEmail(github)).resolves.toBeNull()
  })

  it('refuses a verified address that is not primary', async () => {
    stubGithubEmails(200, [{ email: 'ada@example.com', primary: false, verified: true }])
    await expect(verifiedProviderEmail(github)).resolves.toBeNull()
  })

  it('refuses without an access token, and makes no request', async () => {
    const fetchMock = stubGithubEmails(200, [])
    await expect(verifiedProviderEmail({ provider: 'github' })).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses when the API call fails', async () => {
    stubGithubEmails(401, {})
    await expect(verifiedProviderEmail(github)).resolves.toBeNull()
  })

  it('sends the bearer token to the emails endpoint', async () => {
    const fetchMock = stubGithubEmails(200, [
      { email: 'ada@example.com', primary: true, verified: true },
    ])
    await verifiedProviderEmail(github)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/user/emails',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    )
  })
})
