// src/lib/api/validate.ts
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import type { ZodType } from 'zod'
import { sanitizeInput } from '@/lib/security/sanitize'
import { fail } from './respond'

const MAX_BODY_BYTES = 100 * 1024 // 100 KB

type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

type RawBody =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: NextResponse }

// Transport-level body handling: content type, size, JSON validity, and
// operator-key stripping. Module-private — every route goes through
// parseBody() so that no handler can accept a body without a schema.
async function readJsonBody(req: Request): Promise<RawBody> {
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return { ok: false, response: fail(415, 'Content-Type must be application/json') }
  }

  const tooLarge = () => ({
    ok: false as const,
    response: fail(413, 'Request body too large'),
  })

  // The header is a cheap early reject, not the enforcement point: it is absent
  // on a chunked body and NaN if garbage, and both compare false against the
  // cap — which used to skip the limit entirely and let req.json() buffer
  // whatever arrived. The real check is on bytes actually read.
  const contentLength = Number(req.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return tooLarge()
  }

  let parsed: unknown
  try {
    const raw = await req.arrayBuffer()
    if (raw.byteLength > MAX_BODY_BYTES) return tooLarge()
    parsed = JSON.parse(new TextDecoder().decode(raw))
  } catch {
    return { ok: false, response: fail(400, 'Invalid JSON') }
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, response: fail(400, 'Request body must be a JSON object') }
  }

  // Belt-and-braces now that Zod strips unknown keys: it costs a pass over a
  // small object and protects any future route that forgets a schema.
  return { ok: true, data: sanitizeInput(parsed as Record<string, unknown>) }
}

// The single choke point for a request body. Replaces readJsonBody +
// pickAllowed(ALLOWLIST) + hand-rolled field checks: Zod strips unknown keys,
// so `user`, `_id` and the subdocument arrays cannot be written through any
// route, and the result is typed rather than Record<string, unknown>.
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<Parsed<T>> {
  const body = await readJsonBody(req)
  if (!body.ok) return body

  const result = schema.safeParse(body.data)
  if (!result.success) {
    // One message, matching every other error in the app. Per-field errors are
    // the client's job, produced by react-hook-form from this same schema.
    return { ok: false, response: fail(400, result.error.issues[0].message) }
  }
  return { ok: true, data: result.data }
}

// Query-string equivalent. Converts absent params to `undefined` before
// parsing: URLSearchParams.get() returns null, and a Zod .default() only fires
// on undefined — so passing the raw null would coerce a missing `limit` to 0
// rather than to its default. Centralized here so no caller can get it wrong.
export function parseQuery<T>(searchParams: URLSearchParams, schema: ZodType<T>): Parsed<T> {
  const raw: Record<string, string | undefined> = {}
  for (const [key, value] of searchParams.entries()) raw[key] = value

  const result = schema.safeParse(raw)
  if (!result.success) {
    return { ok: false, response: fail(400, result.error.issues[0].message) }
  }
  return { ok: true, data: result.data }
}

export function toObjectId(id: unknown): string | null {
  return typeof id === 'string' && mongoose.isValidObjectId(id) ? id : null
}
