// src/lib/schemas/common.ts
//
// Reusable field builders shared by every domain schema. These wrap the
// existing helpers in @/lib/security/sanitize rather than reimplementing them
// in Zod, so the protocol allowlist, the 2048-char URL cap and the password
// bounds keep living in exactly one place.
//
// Must stay free of server-only imports — see the note in ./enums.

import { z } from 'zod'
import {
  isAllowedImageUrl,
  isSafeUrl,
  isValidEmail,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MESSAGES,
  PASSWORD_MIN_LENGTH,
} from '@/lib/security/sanitize'

// A trimmed string with explicit bounds. Trim runs before the length checks, so
// '   ' is empty rather than three characters and a value is never rejected for
// trailing whitespace it would not have been stored with. The hand-rolled
// routes measured emptiness trimmed but the cap untrimmed, which disagreed at
// both ends.
export function text(
  label: string,
  { min = 0, max }: { min?: number; max: number },
) {
  const base = z.string({ error: `${label} must be text` }).trim()
  const bounded = min > 0 ? base.min(min, { error: `${label} is required` }) : base
  return bounded.max(max, { error: `${label} must be ${max} characters or less` })
}

// Absolute-URL fields. '' passes so a field can be cleared, matching isSafeUrl.
// Deliberately not z.url(), which accepts javascript: and has no length bound.
export function safeUrl(label: string) {
  return z.string().refine(v => isSafeUrl(v), {
    error: `${label} must be a valid http(s) URL`,
  })
}

// For values rendered into an <img src>: https only, since a bare http: image
// on an https: page is blocked as mixed content anyway.
export function httpsUrl(label: string) {
  return z.string().refine(v => isSafeUrl(v, { httpsOnly: true }), {
    error: `${label} must be a valid https URL`,
  })
}

// Avatars: https + a host allowlist (Cloudinary plus the two OAuth avatar CDNs).
export function imageUrl(label: string) {
  return z.string().refine(isAllowedImageUrl, {
    error: `${label} must be an image from an allowed host`,
  })
}

const CLOUDINARY_HOST = 'res.cloudinary.com'

// Files that only ever come from our own /api/upload. '' passes so the field
// can be cleared. Note this now also inherits isSafeUrl's 2048-char cap, which
// the hand-rolled isCloudinaryUrl in the profile route lacked.
export function isCloudinaryUrl(value: unknown): boolean {
  if (value === '') return true
  if (!isSafeUrl(value, { httpsOnly: true })) return false
  try {
    return new URL(value as string).hostname === CLOUDINARY_HOST
  } catch {
    return false
  }
}

export function cloudinaryUrl(label: string) {
  return z.string().refine(isCloudinaryUrl, {
    error: `${label} must be an uploaded file URL`,
  })
}

// '' passes so an optional contact email can be blank; pass allowEmpty: false
// where the address is the point (register).
export function email(
  message: string,
  { allowEmpty = true }: { allowEmpty?: boolean } = {},
) {
  return z
    .string({ error: message })
    .trim()
    .toLowerCase()
    .refine(v => (allowEmpty && v === '') || isValidEmail(v), { error: message })
}

// Bounds and messages come from sanitize.ts so this and validatePassword()
// cannot drift apart.
export const password = z
  .string({ error: PASSWORD_MESSAGES.required })
  .min(PASSWORD_MIN_LENGTH, { error: PASSWORD_MESSAGES.tooShort })
  .max(PASSWORD_MAX_LENGTH, { error: PASSWORD_MESSAGES.tooLong })

// Upload cap. Isomorphic on purpose: the client checks it to fail fast, the
// /api/upload route enforces it. One constant so the two cannot disagree and
// leave the user with a rejection after a full upload round trip.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

// A Mongo ObjectId as it arrives in a request body. Format-only — ownership
// is enforced by the query, never by the id looking plausible.
const OBJECT_ID_RE = /^[a-f\d]{24}$/i

export function objectId(label: string) {
  return z.string({ error: `Invalid ${label}` }).regex(OBJECT_ID_RE, {
    error: `Invalid ${label}`,
  })
}

const CURRENCY_RE = /^[A-Z]{3}$/

export function currency(label: string) {
  return z.string().regex(CURRENCY_RE, {
    error: `${label} must be a 3-letter code`,
  })
}

// '' and null both mean "cleared". Coercion is what lets one schema serve both
// layers: an HTML number input hands back the string '50000', an API client
// hands back 50000, and both land on the same number. 'abc' becomes NaN, which
// z.number() rejects — so it is a 400, not a silent null.
export function nullableNumber(label: string) {
  return z.preprocess(
    v => (v === '' || v === null ? null : v),
    z.coerce.number({ error: `${label} must be a number` }).nullable(),
  )
}

// Same idea for dates. This is what turns an unparseable date into a 400: the
// hand-rolled `new Date(v)` produced an Invalid Date that only failed later, as
// a Mongoose CastError, which fell through to serverError() as a 500.
export function nullableDate(label: string) {
  return z.preprocess(
    v => (v === '' || v === null ? null : v),
    z.coerce.date({ error: `${label} must be a valid date` }).nullable(),
  )
}
