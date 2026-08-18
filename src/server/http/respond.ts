// src/server/http/respond.ts
import { NextResponse } from 'next/server'

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

// Single choke point for unhandled route errors. Logs the real error server-side
// with a scope tag, but always returns a fixed, generic message — no route-specific
// 500 text survives to fingerprint which handler failed.
export function serverError(scope: string, err: unknown) {
  console.error(`[${scope}]`, err)
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
}
