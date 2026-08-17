// src/lib/dal/applications.ts
import Application from '@/models/Application'

// Every helper takes userId first and requires it, so an ownership-scoped
// query cannot be written without one. Never look up an application by _id
// alone — see the invariant in CLAUDE.md.

export type SubdocumentField = 'notes' | 'contacts' | 'prepFiles'

// Embedded arrays share the parent document's 16 MB ceiling, and nothing
// capped them before: a note may carry 20 000 characters, so an unbounded
// `notes` array eventually makes every write to that application fail — and
// takes the user's whole dashboard and notes feed down with it, since both
// aggregate over the same documents. These bounds keep the worst case well
// inside the ceiling while sitting far above any real usage.
export const SUBDOCUMENT_LIMITS: Record<SubdocumentField, number> = {
  notes: 300,
  contacts: 100,
  prepFiles: 100,
}

export type PushResult<T> =
  | { ok: true; created: T }
  | { ok: false; reason: 'not_found' | 'limit' }

export async function findOwnedApplication(userId: string, appId: string) {
  return Application.findOne({ _id: appId, user: userId })
}

// Appends one subdocument and returns it.
//
// The cap is enforced inside the filter rather than by reading first: if index
// [max - 1] exists the array is already full and the update matches nothing.
// That keeps the happy path a single round trip and leaves no window for two
// concurrent requests to both pass a check-then-write.
export async function pushSubdocument<T>({
  userId,
  appId,
  field,
  value,
}: {
  userId: string
  appId: string
  field: SubdocumentField
  value: Record<string, unknown>
}): Promise<PushResult<T>> {
  const max = SUBDOCUMENT_LIMITS[field]

  const application = await Application.findOneAndUpdate(
    {
      _id: appId,
      user: userId,
      [`${field}.${max - 1}`]: { $exists: false },
    },
    { $push: { [field]: value } },
    { new: true, runValidators: true }
  )

  if (application) {
    const list = application[field]
    return { ok: true, created: list[list.length - 1] as T }
  }

  // No match means either the application isn't the caller's, or it is but the
  // array is full — different statuses, so distinguish them. Only runs on the
  // failure path.
  const exists = await Application.exists({ _id: appId, user: userId })
  return { ok: false, reason: exists ? 'limit' : 'not_found' }
}

// Updates one subdocument in place and returns it.
//
// Written for `notes`, its only caller. The generic signature is here for
// symmetry with the two helpers either side of it, not because a second caller
// is planned.
//
// Three things to know:
//
// 1. The positional `$` binds to whatever matched `${field}._id` in the filter.
//    Drop that condition and the $set has nothing to point at and errors.
// 2. `updatedAt` is written by hand. NoteSchema has { timestamps: true }, but
//    Mongoose maintains subdocument timestamps through the document API
//    (save()), not through a raw positional $set — without this line an edited
//    note keeps its original updatedAt forever.
// 3. Unlike pullSubdocument, which is idempotent by design, an unknown subId
//    matches nothing and returns null. The caller's 404 therefore covers both
//    "not your application" and "no such subdocument" — the same conflation
//    pushSubdocument accepts, and the one the ownership invariant wants.
//
// Note that `runValidators` does NOT reach the subdocument through the
// positional operator, so Zod is the only enum guard on this path. See
// md/step-d-crud.md.
export async function updateSubdocument<T>({
  userId,
  appId,
  field,
  subId,
  value,
}: {
  userId: string
  appId: string
  field: SubdocumentField
  subId: string
  value: Record<string, unknown>
}): Promise<T | null> {
  const setFields = Object.fromEntries(
    Object.entries(value).map(([key, v]) => [`${field}.$.${key}`, v])
  )

  const application = await Application.findOneAndUpdate(
    { _id: appId, user: userId, [`${field}._id`]: subId },
    { $set: { ...setFields, [`${field}.$.updatedAt`]: new Date() } },
    { new: true, runValidators: true }
  )

  return application ? (application[field].id(subId) as T) : null
}

// Removes one subdocument by id. Returns false when the application isn't the
// caller's; removing an id that isn't present is a no-op and still true, so
// a repeated delete is idempotent.
export async function pullSubdocument({
  userId,
  appId,
  field,
  subId,
}: {
  userId: string
  appId: string
  field: SubdocumentField
  subId: string
}): Promise<boolean> {
  const application = await Application.findOneAndUpdate(
    { _id: appId, user: userId },
    { $pull: { [field]: { _id: subId } } },
    { new: true }
  )
  return Boolean(application)
}
