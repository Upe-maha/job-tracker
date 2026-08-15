// src/lib/auth.ts
import NextAuth, { CredentialsSignin } from 'next-auth'
import type { Account, Profile, Session, User as AuthUser } from 'next-auth'
import type { AdapterUser } from 'next-auth/adapters'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import bcrypt from 'bcryptjs'
import { connectDB } from './db'
import User from '@/models/User'
import { checkRateLimit, clearRateLimit, getClientIP } from '@/lib/security/rateLimiter'
import { LOGIN_ERROR } from '@/lib/security/loginErrors'
import { resolveOAuthUser, verifiedProviderEmail } from '@/lib/dal/users'
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
        password: { label: 'Password', type: 'password' }
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
        }
      }
    })
  ],

  session: { strategy: 'jwt' as const },

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

    async jwt({ token, user }: { token: JWT; user?: AuthUser }) {
      if (user?.id) {
        token.id = user.id
        token.photo = user.photo
      }
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
