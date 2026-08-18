// src/hooks/useMutations.ts
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiSend, apiUpload } from '@/client/api-client'
import { qk } from '@/client/query-keys'
import type {
  ApplicationCreatePayload,
  ApplicationUpdateInput,
} from '@/shared/schemas/application'
import type { ContactCreatePayload } from '@/shared/schemas/contact'
import type { NoteCreatePayload, NoteUpdatePayload } from '@/shared/schemas/note'
import type { PrepFileCreateInput } from '@/shared/schemas/prep-file'
import type { ProfileUpdateInput } from '@/shared/schemas/user'
import type { ApplicationStatus, IApplication, INote, OAuthProvider } from '@/types'

// Anything that writes goes through here. Two things this buys that the 13
// hand-rolled fetch calls did not: a failure is always surfaced (several call
// sites ignored res.ok outright), and the set of keys a write invalidates is
// stated once instead of being guessed at each call site — which is how
// ['dashboard'] and ['notes'] ended up never being invalidated by anything.

export function useInvalidators() {
  const qc = useQueryClient()
  return {
    // Any application write can change the dashboard's counts and deadline
    // widgets, so the two travel together.
    applications: () => {
      qc.invalidateQueries({ queryKey: qk.applications.all })
      qc.invalidateQueries({ queryKey: qk.dashboard })
    },
    // A note write additionally changes the cross-application notes feed. The
    // key is prefix-matched so every filter variant is covered.
    notes: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      qc.invalidateQueries({ queryKey: qk.dashboard })
    },
    profile: () => qc.invalidateQueries({ queryKey: qk.profile }),
  }
}

function reportError(error: unknown) {
  toast.error(error instanceof ApiError ? error.message : 'Something went wrong')
}

// ─── Applications ─────────────────────────────────────

export function useCreateApplication() {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (input: ApplicationCreatePayload) =>
      apiSend<IApplication>('POST', '/api/applications', input),
    onSuccess: () => {
      invalidate.applications()
      toast.success('Application added')
    },
    onError: reportError,
  })
}

export function useUpdateApplication(id: string) {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (input: ApplicationUpdateInput) =>
      apiSend<IApplication>('PUT', `/api/applications/${id}`, input),
    onSuccess: () => {
      invalidate.applications()
      toast.success('Application updated')
    },
    onError: reportError,
  })
}

export function useDeleteApplication() {
  const qc = useQueryClient()
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (id: string) => apiSend('DELETE', `/api/applications/${id}`),
    // The detail query has to be dropped, not just invalidated. Deleting from
    // the detail page leaves useApplication(id) mounted, so invalidating
    // ['applications'] refetches it, gets the 404, and flashes ErrorState's
    // "We couldn't find that" before router.push lands.
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.applications.detail(id) })
      invalidate.applications()
      toast.success('Application deleted')
    },
    onError: reportError,
  })
}

// The Kanban drag. No success toast — the card moving is the feedback, and one
// toast per drag would be noise.
export function useUpdateApplicationStatus() {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      apiSend<IApplication>('PATCH', `/api/applications/${id}/status`, { status }),
    onSuccess: () => invalidate.applications(),
    onError: reportError,
  })
}

// ─── Notes ────────────────────────────────────────────

export function useAddNote(applicationId: string) {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (input: NoteCreatePayload) =>
      apiSend('POST', `/api/applications/${applicationId}/notes`, input),
    onSuccess: () => {
      invalidate.notes()
      invalidate.applications()
      toast.success('Note added')
    },
    onError: reportError,
  })
}

export function useUpdateNote(applicationId: string) {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (input: NoteUpdatePayload) =>
      apiSend<INote>('PUT', `/api/applications/${applicationId}/notes`, input),
    onSuccess: () => {
      invalidate.notes()
      invalidate.applications()
      toast.success('Note updated')
    },
    onError: reportError,
  })
}

export function useDeleteNote(applicationId: string) {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (noteId: string) =>
      apiSend('DELETE', `/api/applications/${applicationId}/notes`, { noteId }),
    onSuccess: () => {
      invalidate.notes()
      invalidate.applications()
      toast.success('Note deleted')
    },
    onError: reportError,
  })
}

// ─── Contacts ─────────────────────────────────────────

export function useAddContact(applicationId: string) {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (input: ContactCreatePayload) =>
      apiSend('POST', `/api/applications/${applicationId}/contacts`, input),
    onSuccess: () => {
      invalidate.applications()
      toast.success('Contact added')
    },
    onError: reportError,
  })
}

export function useDeleteContact(applicationId: string) {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (contactId: string) =>
      apiSend('DELETE', `/api/applications/${applicationId}/contacts`, { contactId }),
    onSuccess: () => {
      invalidate.applications()
      toast.success('Contact deleted')
    },
    onError: reportError,
  })
}

// ─── Prep files ───────────────────────────────────────

export function useAddPrepFile(applicationId: string) {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (input: PrepFileCreateInput) =>
      apiSend('POST', `/api/applications/${applicationId}/prep-files`, input),
    onSuccess: () => {
      invalidate.applications()
      toast.success('File added')
    },
    onError: reportError,
  })
}

export function useDeletePrepFile(applicationId: string) {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (fileId: string) =>
      apiSend('DELETE', `/api/applications/${applicationId}/prep-files`, { fileId }),
    onSuccess: () => {
      invalidate.applications()
      toast.success('File deleted')
    },
    onError: reportError,
  })
}

// ─── User ─────────────────────────────────────────────

export function useUpdateProfile() {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) =>
      apiSend('PUT', '/api/user/profile', input),
    onSuccess: () => {
      invalidate.profile()
      toast.success('Profile saved')
    },
    onError: reportError,
  })
}

// Step E. Two halves of connecting a provider, split because only the first is
// an API call: this records intent (an account_link token in an httpOnly
// cookie) and the caller then hands off to next-auth's signIn for the redirect.
// No invalidation — the page is about to leave.
export function useStartLinkAccount() {
  return useMutation({
    mutationFn: () => apiSend<{ ok: true }>('POST', '/api/user/link-account', {}),
    onError: reportError,
  })
}

export function useDisconnectAccount() {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (provider: OAuthProvider) =>
      apiSend<{ ok: true }>('DELETE', `/api/user/accounts/${provider}`),
    onSuccess: () => {
      invalidate.profile()
      toast.success('Account disconnected')
    },
    onError: reportError,
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      apiSend<{ message: string }>('PUT', '/api/user/password', input),
    // Confirm-first since Step C — nothing has changed yet, so the toast must
    // not claim it has.
    onSuccess: (data) => toast.success(data.message),
    // Errors stay inline: the settings form renders them next to the fields.
  })
}

// ─── Email verification and password recovery (Step C) ─

export function useResendVerification() {
  return useMutation({
    mutationFn: () => apiSend<{ message: string }>('POST', '/api/auth/resend-verification', {}),
    // No toast either way: the banner renders both outcomes inline and stays on
    // screen, which is the whole point — a toast disappears, and a banner that
    // looks unchanged afterwards is what got clicked four times.
  })
}

// Used by the two pages that redeem a link. The token is the whole credential,
// so these are plain mutations with no invalidation of their own — except
// verify-email, whose caller invalidates ['profile'] to clear the banner.
export function useVerifyEmail() {
  const invalidate = useInvalidators()
  return useMutation({
    mutationFn: (token: string) =>
      apiSend<{ message: string }>('POST', '/api/auth/verify-email', { token }),
    onSuccess: () => invalidate.profile(),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiSend<{ message: string }>('POST', '/api/auth/forgot-password', { email }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      apiSend<{ message: string }>('POST', '/api/auth/reset-password', input),
  })
}

export function useConfirmPasswordChange() {
  return useMutation({
    mutationFn: (token: string) =>
      apiSend<{ message: string }>('POST', '/api/auth/confirm-password-change', { token }),
  })
}

// ─── Uploads ──────────────────────────────────────────

export function useUpload() {
  return useMutation({
    mutationFn: async ({
      file,
      folder,
    }: {
      file: File
      folder: 'avatars' | 'prep-files' | 'resumes' | 'note-files'
    }) => {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', folder)
      return apiUpload<{ url: string }>('/api/upload', form)
    },
    onError: reportError,
  })
}
