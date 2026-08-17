// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  })

  const isLoggedIn = !!token
  const path = req.nextUrl.pathname

  // Step G. `/` is the public landing page now, so only a signed-in visitor is
  // redirected off it — sending a signed-out one to /login is what made the
  // page unreachable, and is the whole of this step's routing change.
  //
  // `/` must stay out of both lists below: adding it to isAuthPage restores the
  // redirect this removed, and adding it to isDashboard bounces the very
  // visitors the page exists for.
  if (path === '/' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  const isAuthPage =
    path.startsWith('/login') ||
    path.startsWith('/register')

  const isDashboard =
    path.startsWith('/dashboard') ||
    path.startsWith('/applications') ||
    path.startsWith('/profile') ||
    path.startsWith('/notes') ||
    path.startsWith('/analytics') ||
    path.startsWith('/settings')

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
