#Step D — Application & Note CRUD (edit + delete)

Status: planned → implemented in this step.

Two capabilities the app has never had: **edit/delete an application from its detail page**, and
**edit a note** (delete existed, but unguarded). A third thing falls out of both: the app had no
delete confirmation anywhere.

## Context

The two halves of this step start from very different places.

**Applications were half-built.** `PUT` and `DELETE` on `/api/applications/[id]` were complete, and
`useUpdateApplication`/`useDeleteApplication` existed in `useMutations.ts`. `useDeleteApplication`
had **zero call sites** — it was written during the Phase-6 client refactor and never wired to a
button, so it had never run. Only UI was missing, but "existing code" and "proven code" are not the
same thing here.

**Notes needed new plumbing.** `noteCreateSchema` and `noteDeleteSchema` existed; there was no
update schema, no DAL update-in-place helper, and no `PUT` handler. `pushSubdocument` and
`pullSubdocument` cover append and remove; nothing modified a subdocument in place.

**Nothing confirmed a delete.** `NoteCard`'s trash icon called `onDelete(note._id)` directly from
`onClick`. Adding application delete — which destroys every note, contact and prep file on the
document — without a confirmation step would have made that considerably worse, so the dialog is
part of this step rather than a follow-up.

## Decisions locked with the user

1. **Scope is the three detail note tabs.** `/notes` and the dashboard `NotesFeed` stay read-only
   links into the detail page. Both read `fetchNotesFeed`, whose projection deliberately omits
   `interviewRound`/`outcome`/`whatWentWrong`/`whatToImprove` — editing from there would mean either
   widening that projection (the opposite of the helper's documented purpose) or shipping a modal
   that silently drops fields it never loaded.
2. **`companyLogo` gets a UI at last.** `applicationCreateSchema` omitted it with the comment "PUT is
   its only writer" — and PUT had no UI, so the field was unreachable even though `DetailHeader`
   renders it. It now appears in the shared form and in the create schema. `httpsUrl` already accepts
   `''`, so a blank input clears it.
3. **`updateSubdocument` gets a real-`mongod` test.** Same reasoning as
   `tests/integration/server/data/tokens.test.ts`: ownership scoping and the positional-`$` binding are properties of a
   MongoDB *query*, and a mocked model can only assert the shape of the filter object — which passes
   just as happily when the semantics are wrong.
4. **Note edit state lives in the detail page**, not in each of the three tabs. See below.

## Approach

### Note update — why a new DAL helper

`pushSubdocument` and `pullSubdocument` are append and remove; neither modifies in place, and
neither could be bent into doing so without changing what they mean. `updateSubdocument` is the
third operation, and it takes the same shape as its two neighbours — `userId` first and required, so
an ownership-scoped query cannot be written without one.

It is written for `notes`, its only caller. The generic signature exists for symmetry with the two
helpers it sits between, not because a second caller is planned; the day one arrives is the day to
decide what it needs.

Three properties matter:

- **The positional `$` needs its match in the filter.** `{ _id, user, 'notes._id': subId }` is what
  binds `$` — without that third condition the `$set` has nothing to point at and errors.
- **`updatedAt` is written by hand.** `NoteSchema` carries `{ timestamps: true }` and `INote` exposes
  `updatedAt`, but Mongoose maintains subdocument timestamps through the document API (`save()`), not
  through a raw positional `$set`. Without the explicit `notes.$.updatedAt` an edited note would keep
  its original value forever.
- **A missing `subId` returns `null`, so the route's 404 is a conflation.** "Not your application"
  and "no such note" answer identically — the same trade `pushSubdocument` already makes, and the
  same one the ownership invariant wants: a caller learns nothing about documents that aren't theirs.

**`runValidators: true` does not reach the subdocument here.** Mongoose's update validators don't
bind through the positional operator, so `notes.$.type` is not checked against `NoteSchema`'s enum.
The flag stays (harmless, and CLAUDE.md wants it on every `findOneAndUpdate` as defense in depth),
but on this path **Zod is the only enum guard** — which is consistent with schemas being the single
source of truth, and is worth knowing before anyone assumes Mongoose is a backstop here.

### Why the body carries `noteId`, not the URL

`PUT /api/applications/[id]/notes` with `{ noteId, ...updates }`, matching the existing `DELETE` on
the same route rather than introducing `/notes/[noteId]`. A nested dynamic segment would mean a
second `params` promise to await, a second `toObjectId` guard, and a fourth route file — for an
addressing scheme the other two subdocument routes don't use. Consistency across the three
subdocument routes is worth more here than URL purity.

### Update is partial, which is what makes the form safe

`noteUpdateSchema` is `.partial()` over the same field map as create, plus `noteId`, with a
`> 1` key check (`noteId` always occupies one). The route `$set`s only the keys it receives.

That is also why `ApplicationForm` can omit `tags`/`jobDescription`/`followUpDate`: those fields are
**preserved, not cleared**, because the request never mentions them. "Matches the Add form" is the
reason the field list looks the way it does; the partial update is the reason editing can't silently
wipe data the form doesn't show.

The note modal, by contrast, always submits all six fields — `noteFormSchema` has no defaults and
`handleTypeChange` explicitly clears the fields the new type doesn't show — so switching a note from
`interview_question` to `general` genuinely clears the stale round and outcome server-side.

### Confirm-before-delete

New vendored `ui/alert-dialog.tsx` (shadcn AlertDialog, hand-adjusted to the unified `radix-ui`
package — the generator emits `@radix-ui/react-*`, which is not a dependency here) plus
`common/ConfirmDeleteDialog.tsx` over it.

**Dialog state is local to whichever component renders the delete button.** The mutations live in
`page.tsx`, so a child cannot see the mutation's `isPending`; each of `NoteCard`/`DetailHeader`
tracks its own `isDeleting` around `await onDelete(...)`. This keeps the prop surface at just
`onDelete` — no `deletingId` threading through parents — and `onDelete`'s signature is unchanged, so
note delete is a behaviour fix (immediate → confirmed) rather than an API change.

### Note edit state belongs to the page, not the tabs

`page.tsx` already owns every note handler and threads `onAdd`/`onDelete` into all three tabs, so
`onEdit` follows the same path with no new pattern: one `useState`, one modal instance, and each tab
changes by exactly one prop that it hands straight to `NoteCard`.

Putting it in the tabs instead would have triplicated identical state and forced each tab's bare
`<NoteTabShell>` return into a fragment — the modal has to be a *sibling* of the shell to escape its
`isEmpty ? … : children` branch. `NoteTabShell` keeps owning the **add** modal, which is genuinely
per-tab because each supplies its own `defaultType`.

**Both modals mount conditionally rather than staying mounted.** `defaultValues` is read by RHF only
at mount, so a persistent modal needs a reset effect that is easy to get subtly wrong; `{editingNote
&& <NoteModal … />}` mounts fresh with the right values and needs no effect at all. The cost is the
dialog's exit animation. (For `EditApplicationModal` a `key={application._id}` would have been the
obvious alternative and is a no-op — there is exactly one application on a detail page, so the key
never changes.)

### Close only on success

`NoteModal.onSubmit` awaits its caller and closes *after* it resolves. A rejected `mutateAsync`
throws before the close, so a failed save leaves the modal open with the user's text intact and the
mutation's own `onError` toast explains why. Nothing wraps this in a `try`/`catch` — swallowing the
rejection would close the modal on failure and lose the text.

In edit mode there is no `form.reset`: `onClose` is `setEditingNote(null)`, which unmounts the modal
and discards its state anyway, so resetting first would only risk a blank form flashing during the
close animation. Add mode keeps its reset, because that modal stays mounted.

### Deleting an application without a 404 flash

`useDeleteApplication`'s `onSuccess` invalidates `['applications']`, which refetches the
*still-mounted* `useApplication(id)` on the detail page, gets its 404, and renders `ErrorState`'s
"We couldn't find that" before `router.push` lands. The fix is to drop the dead query first:

```ts
onSuccess: (_data, id) => {
  qc.removeQueries({ queryKey: qk.applications.detail(id) })
  invalidate.applications()
  …
}
```

This lives in the hook rather than the page, matching the existing convention that each mutation
states its own cache effects.

## Follow-ups deliberately not done here

- **`/notes` page editing** — decision 1 above. Would need `fetchNotesFeed`'s projection widened.
- **An "edited" indicator on `NoteCard`.** `notes[].updatedAt` is now maintained correctly, so the
  data is there; showing it is a display decision that belongs with the card's other timestamp work.
- **Optimistic updates.** Every mutation here invalidates and refetches. The detail page is a single
  document and the round trip is short; optimism costs rollback logic for no visible gain at this
  size.
