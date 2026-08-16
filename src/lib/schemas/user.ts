// src/lib/schemas/user.ts
import { z } from 'zod'
import { JOB_SEARCH_STATUSES } from './enums'
import {
  cloudinaryUrl,
  currency,
  imageUrl,
  password,
  text,
} from './common'

// photo is deliberately looser than resume: since Step B an avatar may be
// served by the Google or GitHub CDN, because an OAuth sign-in supplies one on
// the provider's own domain. resume only ever comes from our own /api/upload.
const fields = {
  name: text('Name', { min: 1, max: 100 }),
  bio: text('Bio', { max: 1000 }),
  location: text('Location', { max: 200 }),
  phone: text('Phone', { max: 30 }),
  linkedIn: text('LinkedIn', { max: 200 }),
  portfolio: text('Portfolio', { max: 200 }),
  currency: currency('Currency'),
  jobSearchStatus: z.enum(JOB_SEARCH_STATUSES, {
    error: 'Invalid job search status',
  }),
  photo: imageUrl('Photo'),
  resume: cloudinaryUrl('Resume'),
}

// Replaces PROFILE_UPDATABLE + validateProfileUpdate wholesale — Zod's
// unknown-key stripping is what kept email, password and the lockout fields
// unwritable through this route.
export const profileUpdateSchema = z
  .object(fields)
  .partial()
  .refine(v => Object.keys(v).length > 0, { error: 'No valid fields to update' })

// The profile page's form. photo is managed by AvatarUpload outside the form
// and merged in at submit time, so it isn't bound here.
export const profileFormSchema = z.object({
  name: fields.name,
  bio: fields.bio,
  location: fields.location,
  phone: fields.phone,
  linkedIn: fields.linkedIn,
  portfolio: fields.portfolio,
  currency: fields.currency,
  jobSearchStatus: fields.jobSearchStatus,
})

const DIFFERENT_PASSWORD_MESSAGE =
  'New password must be different from the current password'

// currentPassword is only length-checked, never strength-checked: it is an
// existing secret, and applying today's policy to it would reject accounts
// created under an older one.
export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string({ error: 'Both fields are required' })
      .min(1, { error: 'Both fields are required' }),
    newPassword: password,
  })
  .refine(v => v.newPassword !== v.currentPassword, {
    error: DIFFERENT_PASSWORD_MESSAGE,
    path: ['newPassword'],
  })

export const passwordChangeFormSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: 'Current password is required' }),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine(v => v.newPassword === v.confirmPassword, {
    error: 'New passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(v => v.newPassword !== v.currentPassword, {
    error: DIFFERENT_PASSWORD_MESSAGE,
    path: ['newPassword'],
  })

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type ProfileFormValues = z.input<typeof profileFormSchema>
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>
export type PasswordChangeFormValues = z.input<typeof passwordChangeFormSchema>
