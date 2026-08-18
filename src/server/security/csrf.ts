// src/server/security/csrf.ts
import { NextResponse } from 'next/server'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function allowedOrigins(req: Request): Set<string> {
  const origins = new Set<string>()

  if (process.env.NEXTAUTH_URL) {
    try {
      origins.add(new URL(process.env.NEXTAUTH_URL).origin)
    } catch {
      // ignore malformed env value
    }
  }

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (host) {
    origins.add(`https://${host}`)
    origins.add(`http://${host}`)
  }

  return origins
}

// Same-origin check for cookie-session routes. GET/HEAD/OPTIONS are exempt —
// they must stay side-effect-free by convention.
//
// Order: Sec-Fetch-Site (can't be forged by JS, sent by every modern browser)
// -> Origin (fallback for older/unusual clients) -> neither present -> allow.
// The final "allow" is the standard OWASP fallback: a real browser always sends
// Origin on a cross-origin state-changing request, so a request with neither
// header is not a browser-driven CSRF attempt (and this keeps curl/non-browser
// clients working).
export function isSameOriginRequest(req: Request): boolean {
  if (SAFE_METHODS.has(req.method)) return true

  const secFetchSite = req.headers.get('sec-fetch-site')
  if (secFetchSite) return secFetchSite === 'same-origin'

  const origin = req.headers.get('origin')
  if (origin) return allowedOrigins(req).has(origin)

  return true
}

export function csrfFailure() {
  return NextResponse.json({ error: 'Request blocked' }, { status: 403 })
}
