// src/lib/api/validate.ts
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { sanitizeInput } from '@/lib/security/sanitize'

const MAX_BODY_BYTES = 100 * 1024 // 100 KB

type JsonBodyResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: NextResponse }

// Single choke point for parsing + sanitizing request bodies. Every custom
// route that accepts a body should go through this instead of req.json().
export async function readJsonBody(req: Request): Promise<JsonBodyResult> {
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 }),
    }
  }

  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Request body too large' }, { status: 413 }),
    }
  }

  let parsed: unknown
  try {
    parsed = await req.json()
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }),
    }
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 }),
    }
  }

  const data = sanitizeInput(parsed as Record<string, unknown>)
  return { ok: true, data }
}

// Copies only present keys from src (using `in`, so an explicit null survives
// but an absent key doesn't clobber to undefined).
export function pickAllowed<K extends string>(
  src: Record<string, unknown>,
  keys: readonly K[]
): Partial<Record<K, unknown>> {
  const out: Partial<Record<K, unknown>> = {}
  for (const key of keys) {
    if (key in src) out[key] = src[key]
  }
  return out
}

export function toObjectId(id: unknown): string | null {
  return typeof id === 'string' && mongoose.isValidObjectId(id) ? id : null
}
