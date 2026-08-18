// src/shared/schemas/auth.ts
import { z } from 'zod'
import { email, password, text } from './common'

export const registerSchema = z.object({
  name: text('Name', { min: 1, max: 100 }),
  email: email('Please enter a valid email address', { allowEmpty: false }),
  password,
})

export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine(v => v.password === v.confirmPassword, {
    error: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// Login only checks that a password was typed. Applying the 6-character policy
// here would both leak it to an attacker and lock out any account created under
// an older rule — the credential check itself is authorize()'s job.
export const loginSchema = z.object({
  email: email('Please enter a valid email address', { allowEmpty: false }),
  password: z.string().min(1, { error: 'Password is required' }),
  // Step I. Only ever chooses between two idle timeouts (see
  // security/sessionPolicy) — it is a convenience control, never a credential,
  // so there is nothing here to validate beyond its type.
  rememberMe: z.boolean().default(false),
})

// ── Step C: email tokens ───────────────────────────────────────────────────
//
// Lifetimes live here rather than in the DAL because they are isomorphic: the
// email copy and the pages both tell the user how long a link lasts, and a
// second constant elsewhere is how those two start disagreeing.
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000 // 1 hour
export const PASSWORD_CHANGE_TTL_MS = 60 * 60 * 1000 // 1 hour

// 32 random bytes as base64url — 43 chars, no padding. The length is fixed, so
// checking it here means a malformed ?token never reaches a database query.
// This belongs in the schema layer: a regex in a route file is the layering
// violation eslint.config.mjs exists to catch.
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

const token = z
  .string({ error: 'This link is invalid or has expired' })
  .regex(TOKEN_RE, { error: 'This link is invalid or has expired' })

export const verifyTokenSchema = z.object({ token })

export const forgotPasswordSchema = z.object({
  email: email('Please enter a valid email address', { allowEmpty: false }),
})

export const resetPasswordSchema = z.object({ token, password })

export type RegisterInput = z.infer<typeof registerSchema>
export type RegisterFormValues = z.input<typeof registerFormSchema>
export type LoginFormValues = z.input<typeof loginSchema>
export type VerifyTokenPayload = z.input<typeof verifyTokenSchema>
export type ForgotPasswordFormValues = z.input<typeof forgotPasswordSchema>
export type ResetPasswordFormValues = z.input<typeof resetPasswordSchema>
