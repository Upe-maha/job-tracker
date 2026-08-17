// src/app/api/auth/session-ended/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAMES } from '@/lib/security/sessionCookie'

// Where a session goes to die.
//
// Step I made it possible for a cookie to be *decodable but rejected* — idle
// past its window, or issued before a password change. That splits two notions
// of "signed in" that used to agree:
//
//   middleware asks "does this JWT decode?"  → yes
//   (dashboard)/layout asks auth(), which runs the policy → no
//
// so the layout redirected to /login, middleware saw a valid-looking cookie and
// bounced straight back to /dashboard, and the browser gave up with
// ERR_TOO_MANY_REDIRECTS. A server component cannot clear a cookie, so nothing
// in that loop could ever break it.
//
// A route handler can. This is the one place that removes the stale cookie, so
// the next request is unambiguously signed out and the two questions agree
// again.
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login?reason=session_ended', req.url))

  // Both names, because the prefix depends on deployment rather than on
  // anything visible here, and clearing the wrong one leaves the loop intact.
  for (const name of SESSION_COOKIE_NAMES) {
    res.cookies.set({ name, value: '', path: '/', maxAge: 0 })
  }

  return res
}
