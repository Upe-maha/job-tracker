// src/app/api/files/route.ts
import type { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import { guard } from '@/lib/api/guard'
import { parseQuery } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'
import { resolveOwnedFile } from '@/lib/dal/files'
import { fileProxyQuerySchema } from '@/shared/schemas/file'

// Serves an uploaded PDF through the app instead of linking at Cloudinary.
//
// Forced, and measured rather than assumed: a raw Cloudinary asset comes back
// as `application/octet-stream` with `Content-Disposition: attachment`, so a
// browser downloads it and no viewer will render it inline. The `.pdf`
// extension that would fix the content type is refused by delivery (HTTP 401 +
// a placeholder GIF) unless the account opts into PDF/ZIP delivery, which is
// off by default. Re-labelling here is the only fix that needs no account
// change — and it is the better one anyway, because the Cloudinary URL is
// world-readable to anyone holding it and this route is not.
export async function GET(req: NextRequest) {
  const g = await guard(req, { rateLimit: 'read' })
  if (!g.ok) return g.response

  const query = parseQuery(req.nextUrl.searchParams, fileProxyQuerySchema)
  if (!query.ok) return query.response

  try {
    await connectDB()

    // Ownership, not plausibility. Every asset sits under one cloud name, so
    // "is a Cloudinary URL" would let any signed-in user stream any other
    // user's CV through here.
    const owned = await resolveOwnedFile(g.session.user.id, query.data.url)
    if (!owned) return fail(404, 'File not found')

    const upstream = await fetch(query.data.url)
    if (!upstream.ok || !upstream.body) {
      // Upstream's status is not this route's status: a 401 from Cloudinary is
      // a delivery-settings problem, not the caller's, and echoing it would
      // read as an auth failure against this app.
      console.error('[files.GET] upstream', upstream.status, query.data.url)
      return fail(502, 'Could not load file')
    }

    const disposition = query.data.download === undefined ? 'inline' : 'attachment'
    const length = upstream.headers.get('content-length')

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'application/pdf',
        // The filename the DAL resolved, never one from the query string —
        // this header is attacker-controllable otherwise. It is already
        // reduced to a safe character set, and quoted here.
        'Content-Disposition': `${disposition}; filename="${owned.filename}"`,
        ...(length ? { 'Content-Length': length } : {}),
        // Private: it is one user's document, and the response varies by who
        // asked. A shared cache holding this would be the leak the ownership
        // check exists to prevent.
        'Cache-Control': 'private, max-age=300, must-revalidate',
        // The framing and sandbox headers for this path are in next.config.ts,
        // not here: config headers win over anything a route sets, and the
        // app-wide `X-Frame-Options: DENY` would otherwise stop the preview
        // dialog framing its own response. That exception has to live at the
        // level that creates it.
      },
    })
  } catch (error) {
    return serverError('files.GET', error)
  }
}
