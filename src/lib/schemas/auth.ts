// src/lib/schemas/auth.ts
import { z } from 'zod'
import { email, password, text } from './common'

export const registerSchema = z.object({
  name: text('Name', { min: 1, max: 100 }),
  email: email('Please enter a valid email address', { allowEmpty: false }),
  password,
})

// Login only checks that a password was typed. Applying the 6-character policy
// here would both leak it to an attacker and lock out any account created under
// an older rule — the credential check itself is authorize()'s job.
export const loginSchema = z.object({
  email: email('Please enter a valid email address', { allowEmpty: false }),
  password: z.string().min(1, { error: 'Password is required' }),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type RegisterFormValues = z.input<typeof registerSchema>
export type LoginFormValues = z.input<typeof loginSchema>
