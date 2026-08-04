// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  })

  const isLoggedIn = !!token
  const path = req.nextUrl.pathname

  if (path === '/') {
    return NextResponse.redirect(new URL(isLoggedIn ? '/dashboard' : '/login', req.url))
  }

  const isAuthPage =
    path.startsWith('/login') ||
    path.startsWith('/register')

  const isDashboard =
    path.startsWith('/dashboard') ||
    path.startsWith('/applications') ||
    path.startsWith('/profile')

  if (!isLoggedIn && isDashboard) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}