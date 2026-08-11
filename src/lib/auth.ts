// src/lib/auth.ts
import NextAuth, { CredentialsSignin } from 'next-auth'
import type { Session, User as AuthUser } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { connectDB } from './db'
import User from '@/models/User'
import { checkRateLimit, clearRateLimit, getClientIP } from '@/lib/security/rateLimiter'
import { LOGIN_ERROR } from '@/lib/security/loginErrors'

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

const config = {
  providers: [
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

        const locked = !!user.lockUntil && user.lockUntil.getTime() > Date.now()
        if (locked) {
          // Only the true owner (correct password) learns the account is
          // locked — a guesser gets the same generic error as any other
          // wrong password, so lock state never leaks to an attacker.
          throw isValid ? new AccountLocked() : new InvalidCredentials()
        }

        if (!isValid) {
          const attempts = (user.failedLoginAttempts ?? 0) + 1
          await User.updateOne(
            { _id: user._id },
            attempts >= MAX_FAILED_ATTEMPTS
              ? { $set: { failedLoginAttempts: attempts, lockUntil: new Date(Date.now() + LOCK_MS) } }
              : { $set: { failedLoginAttempts: attempts } }
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
