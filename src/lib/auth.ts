// src/lib/auth.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { connectDB } from './db'
import User from '@/models/User'

const config = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        await connectDB()

        const user = await User.findOne({
          email: (credentials.email as string).toLowerCase()
        })



        if (!user) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )


        if (!isValid) return null

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
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.photo = user.photo
      }
      return token
    },
    async session({ session, token }: any) {
      if (token && session.user) {
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

const { handlers, signIn, signOut, auth } = NextAuth(config)

export { handlers, signIn, signOut, auth }