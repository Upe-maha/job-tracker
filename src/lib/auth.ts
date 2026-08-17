// src/lib/auth.ts
import { cookies } from 'next/headers'
import NextAuth, { CredentialsSignin } from 'next-auth'
import type { Account, Profile, Session, User as AuthUser } from 'next-auth'
import type { AdapterUser } from 'next-auth/adapters'
import { getToken } from 'next-auth/jwt'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import bcrypt from 'bcryptjs'
import { connectDB } from './db'
import User from '@/models/User'
import { checkRateLimit, clearRateLimit, getClientIP } from '@/lib/security/rateLimiter'
import { LINK_ERROR, LOGIN_ERROR } from '@/lib/security/loginErrors'
import {
  fetchSessionUser,
  linkProviderToUser,
  resolveOAuthUser,
  verifiedProviderEmail,
} from '@/lib/dal/users'
import { consumeToken } from '@/lib/dal/tokens'
import { ACCOUNT_LINK_COOKIE } from '@/lib/security/linkIntent'
import {
  DEFAULT_IDLE_MS,
  REMEMBERED_IDLE_MS,
  sessionVerdict,
} from '@/lib/security/sessionPolicy'
import type { OAuthProvider } from '@/lib/schemas/enums'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000 // 15 minutes

// Bcrypt hash (cost 12, matching production) of a fixed throwaway string.
// Compared against on every unknown-user login so an attacker can't tell
// "no such account" from "wrong password" by response time. Generated once
// offline — never compute this at module load, that's ~250ms on every cold
// serverless start.
const DUMMY_HASH = '$2b$12$szKk0hIq/MNZpAovM1biteyMFgCxhldpIDzqm6kPsqoGnoDOmuelS'

class InvalidCredentials extends CredentialsSignin {
  code = LOGIN_ERROR.INVALID
}
class RateLimited extends CredentialsSignin {
  code = LOGIN_ERROR.RATE_LIMITED
}
class AccountLocked extends CredentialsSignin {
  code = LOGIN_ERROR.LOCKED
}

// Returning a string from the signIn callback is treated by @auth/core as a
// redirect URL (handleAuthorized in lib/actions/callback), so this is how an
// OAuth failure reports itself — a falsy return would collapse every distinct
// cause into a generic AccessDenied.
const oauthFailure = (code: string) => `/login?error=${code}`

// Step E's equivalent. A failed *link* belongs back on the page that started
// it, with its own vocabulary — the user is already signed in and nothing about
// their session changed, so /login?error=... would be actively misleading.
const linkFailure = (code: string) => `/profile?error=${code}`

// Who is signed in *right now*, read from the session cookie exactly as
// src/middleware.ts reads it. The signIn callback gets no request object, so
// the cookie store is rebuilt into the headers getToken expects.
//
// Only used by the link branch. A failure to read is treated as "nobody",
// which fails safe: the branch is skipped and the request is handled as an
// ordinary sign-in, rather than a link being applied to an unverified identity.
async function currentUserId(
  store: Awaited<ReturnType<typeof cookies>>
): Promise<string | null> {
  try {
    const cookieHeader = store
      .getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ')

    const token = await getToken({
      req: { headers: new Headers({ cookie: cookieHeader }) } as unknown as Request,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
    })

    return typeof token?.id === 'string' ? token.id : null
  } catch (error) {
    console.error('[auth.currentUserId]', error)
    return null
  }
}

const config = {
  providers: [
    // allowDangerousEmailAccountLinking stays false: the signIn callback below
    // does the linking itself, gated on a provider-verified email.
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember me', type: 'checkbox' }
      },
      async authorize(credentials, request) {
        const email = typeof credentials?.email === 'string' ? credentials.email.toLowerCase().trim() : null
        const password = typeof credentials?.password === 'string' ? credentials.password : null
        if (!email || !password) throw new InvalidCredentials()

        // IP rate limit is the only signal available before touching the DB.
        const ip = getClientIP(request)
        const rl = await checkRateLimit(`ip:${ip}`, 'login')
        if (!rl.allowed) throw new RateLimited()

        await connectDB()

        const user = await User.findOne({ email }).select('+password')

        // Timing equalization: compare against a dummy hash for unknown users
        // so this branch costs the same as a real wrong-password check.
        const hash = user?.password ?? DUMMY_HASH
        const isValid = await bcrypt.compare(password, hash)

        if (!user) throw new InvalidCredentials()

        const lockExpiresAt = user.lockUntil?.getTime() ?? 0
        const locked = lockExpiresAt > Date.now()
        if (locked) {
          // Only the true owner (correct password) learns the account is
          // locked — a guesser gets the same generic error as any other
          // wrong password, so lock state never leaks to an attacker.
          throw isValid ? new AccountLocked() : new InvalidCredentials()
        }

        if (!isValid) {
          // A lock that has expired resets the counter. Without this the
          // counter stays at MAX_FAILED_ATTEMPTS forever, so the very next
          // wrong password re-locks the account and the effective policy
          // silently becomes one attempt per lock window instead of five.
          const priorAttempts = lockExpiresAt > 0 ? 0 : (user.failedLoginAttempts ?? 0)
          const attempts = priorAttempts + 1
          await User.updateOne(
            { _id: user._id },
            attempts >= MAX_FAILED_ATTEMPTS
              ? { $set: { failedLoginAttempts: attempts, lockUntil: new Date(Date.now() + LOCK_MS) } }
              : { $set: { failedLoginAttempts: attempts, lockUntil: null } }
          )
          throw new InvalidCredentials()
        }

        // Success: reset counters and forgive the IP budget so earlier typos
        // don't linger against a legitimate user.
        if (user.failedLoginAttempts || user.lockUntil) {
          await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockUntil: null } })
        }
        await clearRateLimit(`ip:${ip}`, 'login')

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          photo: user.photo ?? '',
          // The checkbox arrives as a string over the credentials transport,
          // so 'false' would be truthy if tested directly. Only the jwt
          // callback consumes this; it never reaches the session.
          rememberMe: credentials?.rememberMe === 'true' || credentials?.rememberMe === true,
        }
      }
    })
  ],

  // maxAge is the cookie's lifetime and the *longest* a session can idle. A
  // JWT strategy has only one cookie lifetime to give, so the shorter
  // unremembered timeout cannot live here — it is enforced per session by the
  // idleMs claim in the jwt callback below. Rolling, not absolute: @auth/core
  // re-issues the cookie on every read, so a daily user is never signed out.
  session: { strategy: 'jwt' as const, maxAge: REMEMBERED_IDLE_MS / 1000 },

  callbacks: {
    // Runs for every sign-in. For OAuth it is where the user document is
    // resolved or created, because this app has no NextAuth adapter — the
    // Mongoose User model stays the single source of truth.
    async signIn({
      user,
      account,
      profile,
    }: {
      user: AuthUser | AdapterUser
      account?: Account | null
      profile?: Profile
    }) {
      // Credentials sign-ins are already fully handled by authorize().
      if (!account || account.provider === 'credentials') return true

      const provider = account.provider as OAuthProvider

      try {
        await connectDB()

        // Step E. A link-intent cookie means this round trip was started by an
        // already-signed-in user pressing Connect, which is a different
        // question from "who is signing in" — so it takes its own branch and
        // never reaches verifiedProviderEmail or resolveOAuthUser.
        //
        // Those resolve a user from the provider's verified email. When that
        // email differs from the one on the job-tracker account — common, and
        // exactly the case Connect exists to serve — they find or create a
        // *different* user, and the user.id overwrite below would hand the
        // session to them silently. Identity here comes from the token instead.
        const cookieStore = await cookies()
        const intent = cookieStore.get(ACCOUNT_LINK_COOKIE)?.value

        // The intent cookie alone is not enough to take the link branch: an
        // abandoned Connect (redirect to the provider, then Back) leaves it
        // sitting in the browser with its token unspent. On a shared computer,
        // the next person to sign in with that provider inside the TTL would
        // otherwise be linked straight into the first user's account. So the
        // branch also requires a live session, and requires it to be the same
        // user the token was issued to.
        //
        // Read the same way src/middleware.ts reads it. Anything short of a
        // match falls through to the ordinary sign-in path below rather than
        // failing — with no session, this *is* an ordinary sign-in.
        const activeUserId = intent ? await currentUserId(cookieStore) : null

        if (intent && activeUserId) {
          // Single-use and type-scoped by consumeToken's filter, so a stale or
          // already-spent request cannot be replayed and no other token type
          // can be redeemed here.
          const consumed = await consumeToken({ token: intent, type: 'account_link' })
          if (!consumed) return linkFailure(LINK_ERROR.EXPIRED)

          // Whoever is signed in now must be who the token was issued to. The
          // token is already spent by this point, which is the right order:
          // a mismatch should burn it rather than leave it available for
          // another try.
          if (consumed.userId.toString() !== activeUserId) {
            return linkFailure(LINK_ERROR.FAILED)
          }

          const result = await linkProviderToUser({
            userId: consumed.userId,
            provider,
            providerAccountId: account.providerAccountId,
          })

          if (!result.ok) {
            if (result.reason === 'in_use') return linkFailure(LINK_ERROR.IN_USE)
            if (result.reason === 'provider_linked') {
              return linkFailure(LINK_ERROR.PROVIDER_LINKED)
            }
            return linkFailure(LINK_ERROR.FAILED)
          }

          // The same invariant the sign-in path maintains, and here it also
          // keeps the session *unchanged*: this is the id the token was issued
          // to, i.e. whoever was already signed in. The other three fields
          // matter for the same reason — @auth/core is minting a fresh JWT from
          // this object, so leaving them would rebuild the session from the
          // linked GitHub profile and the header would start showing that
          // account's name and email.
          user.id = result.user._id.toString()
          user.photo = result.user.photo ?? ''
          user.name = result.user.name
          user.email = result.user.email
          return true
        }

        // Bounds the work one provider account can trigger — a DB read/write
        // plus, for GitHub, an outbound /user/emails call. Keyed on the
        // provider subject rather than an IP because the signIn callback gets
        // no request object. The generic 'api' budget, not 'login': a locked
        // credentials account is not what this is defending, and a tight
        // budget would break legitimate retries.
        const rl = await checkRateLimit(`oauth:${provider}:${account.providerAccountId}`, 'api')
        if (!rl.allowed) return oauthFailure(LOGIN_ERROR.OAUTH_FAILED)

        const email = await verifiedProviderEmail({
          provider,
          accessToken: account.access_token,
          profileEmail: profile?.email,
          profileEmailVerified: (profile as { email_verified?: boolean } | undefined)?.email_verified,
        })
        if (!email) return oauthFailure(LOGIN_ERROR.OAUTH_UNVERIFIED_EMAIL)

        const dbUser = await resolveOAuthUser({
          provider,
          providerAccountId: account.providerAccountId,
          email,
          name: user.name,
          image: user.image,
        })

        if (!dbUser) return oauthFailure(LOGIN_ERROR.OAUTH_FAILED)

        // Clear any credentials lockout. A provider-verified email is stronger
        // evidence of ownership than a password, so reaching here means the
        // real owner is present — and leaving the lock in place would let an
        // attacker's failed guessing deny the owner their own account.
        // Deliberately NOT the reverse: OAuth must not be *blocked* by a lock
        // it can clear, or password guessing becomes a full account DoS.
        if (dbUser.failedLoginAttempts || dbUser.lockUntil) {
          await User.updateOne(
            { _id: dbUser._id },
            { $set: { failedLoginAttempts: 0, lockUntil: null } }
          )
        }

        // The invariant every API route depends on: session.user.id must be
        // the Mongo _id, not the provider's subject id, or every query scoped
        // by `user: g.session.user.id` silently matches nothing.
        //
        // Mutating `user` here works because with no adapter @auth/core passes
        // this exact object through handleLoginOrRegister into the jwt
        // callback (lib/actions/callback/handle-login.js: `return { user: _profile }`).
        user.id = dbUser._id.toString()
        user.photo = dbUser.photo ?? ''
        user.name = dbUser.name
        user.email = dbUser.email

        return true
      } catch (error) {
        console.error('[auth.signIn]', error)
        return oauthFailure(LOGIN_ERROR.OAUTH_FAILED)
      }
    },

    // Runs on every auth() call — every API route through guard(), every
    // dashboard page load — so everything here is on the critical path of a
    // request. The decisions live in sessionPolicy (pure, and unit-tested);
    // this keeps only the I/O.
    //
    // Returning null ends the session: @auth/core's session action calls
    // sessionStore.clean() on a null token, which clears the cookie.
    async jwt({ token, user }: { token: JWT; user?: AuthUser }) {
      const now = Date.now()

      // Sign-in. signedInAt is stamped exactly here and never touched again —
      // `iat` cannot serve this purpose because the token is re-encoded on
      // every read, so it would always look newer than any password change.
      if (user?.id) {
        token.id = user.id
        token.photo = user.photo
        token.signedInAt = now
        token.lastSeen = now
        token.checkedAt = now
        // OAuth has no checkbox and lands on the shorter default.
        token.idleMs = user.rememberMe ? REMEMBERED_IDLE_MS : DEFAULT_IDLE_MS
        return token
      }

      const verdict = sessionVerdict(token, now)
      if (verdict === 'idle-expired') return null

      if (verdict === 'needs-check') {
        try {
          await connectDB()
          const owner = await fetchSessionUser(token.id)

          // A deleted account keeps no live token.
          if (!owner) return null
          if (sessionVerdict(token, now, owner.passwordChangedAt) === 'revoked') return null

          token.checkedAt = now
        } catch (error) {
          // Fail open, matching the read-tier rate limiter: a database blip
          // must not sign the whole userbase out. The window it leaves is one
          // revalidation period, and the next successful request closes it.
          console.error('[auth.jwt.revalidate]', error)
        }
      }

      token.lastSeen = now
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id
        session.user.photo = token.photo
      }
      return session
    }
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  secret: process.env.AUTH_SECRET,
}

export const { handlers, signIn, signOut, auth } = NextAuth(config)
