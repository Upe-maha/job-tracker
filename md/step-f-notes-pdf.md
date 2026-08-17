#Step F — PDF in Notes

Status: planned → implemented in this step.

Three bullets in `md/roadmap.md`: attach a PDF to any note, view it from the note card, remove it.

## Context

Step F is small because Step E paid for it. The hard part of "show a user a PDF" is not the UI —
it is that **Cloudinary will not serve one previewably**. A raw asset comes back as
`application/octet-stream` with `Content-Disposition: attachment`, so every link to one downloads;
and naming it `.pdf` so the content type is right gets the delivery refused outright (HTTP 401 plus
a placeholder GIF) unless the account opts into PDF/ZIP delivery. `md/step-e-profile.md` records the
measurements. `GET /api/files` already solves this, and `common/PdfPreview.tsx` already wraps it in
a dialog, so this step reuses both rather than discovering the problem a second time.

The write side needed nothing new either: `updateSubdocument` (Step D) maps each key of its `value`
to `notes.$.<key>`, so `{ attachment: null }` becomes `$set: { 'notes.$.attachment': null }`. The
note `POST`/`PUT` carry the new field as soon as the schema knows about it.

What was genuinely missing: a field on the note subdocument, an upload control in `NoteModal`, and
`resolveOwnedFile` knowing that a note can own a file.

## Decisions locked with the user

1. **One optional attachment per note** — `attachment: { url, name } | null`, mirroring
   `User.resume`. The roadmap says "the attached PDF" throughout. An array would need its own cap
   (embedded arrays share the parent application's 16 MB ceiling — the reason `SUBDOCUMENT_LIMITS`
   exists) and would turn every add and remove into a positional update inside an array inside an
   array.
2. **The note modal is the only write path.** Attach / Replace / Remove live in `NoteModal` and are
   saved with the note. `NoteCard` gets a View chip and nothing else. One write path into the field,
   no new route, and an abandoned modal changes no data.
3. **The cross-application feed shows it.** `fetchNotesFeed`'s projection gains one field so
   `/notes` and the dashboard widget can render a chip that opens the same dialog. The feed stays
   read-only, as `md/step-d-crud.md` decision 1 locked.

## Architectural invariant

**Only `{ url, name }` is stored, and the URL is the file's identity.** It is the key
`resolveOwnedFile` matches ownership on and the key `/api/files` serves from, which is exactly what
lets an attachment be authorised with no extra field and no new route. Three consequences, all
intended:

- **A URL is unique per upload.** `pdfPublicId` appends eight random hex characters precisely so two
  uploads of `notes.pdf` cannot collide, which is what makes the URL usable as an identity at all.
- **"Uploaded" and "persisted" are different events, and only the second one counts.** The modal
  uploads on file-pick; the note is written on submit. In between, the asset exists and the app has
  no record of it — so it is unreachable through `/api/files`, which serves nothing it cannot find
  on a document the caller owns. An abandoned modal leaks storage, never access.
- **No Cloudinary cleanup here, not even partial.** Deleting an asset needs its `publicId`, which
  nothing stores yet. R4 introduces that field and handles abandoned, replaced and removed
  attachments *together*. Destroying the old asset on Replace would be cleanup that fires on one of
  the three paths and would have to be unpicked when R4 lands.

R4 swapping the stored identity from URL to `publicId` is the anticipated migration, and it is why
`resolveOwnedFile` — not its callers — owns the URL→ownership lookup: one place changes.

## Approach

### `resolveOwnedFile` gets a third branch

This is the load-bearing change. `/api/files` refuses any URL it cannot prove the caller owns, so
without teaching it about notes, every attachment preview would 404 — the feature would be complete
and non-functional. The branch is a positional lookup on `{ user, 'notes.attachment.url': url }`
projecting `{ 'notes.$': 1 }`, returning the attachment's stored `name` as the filename, sanitised
the same way the prep-file branch sanitises: it ends up in a `Content-Disposition` header.

The ownership filter is the whole control. A missing `user:` on that query would serve any note's
PDF to any signed-in caller, which is why `src/lib/dal/files.integration.test.ts` pins the
cross-user refusal against a real `mongod` rather than a mocked model.

### Everything else

- **`note-files`** joins the upload folder allowlist, PDF-only, exactly as `resumes` did in Step E.
  Per-folder MIME lists are what keep a caller out of an allowlist it never intended.
- **`NoteModal`** gains an attachment row: pick → upload → `form.setValue('attachment', …)`.
  `handleTypeChange` must **not** clear it: that function clears the fields the newly chosen type
  stops showing, and an attachment is type-independent.
- **`NoteCard`** renders a chip wrapping `PdfPreview`.
- **The feed rows are wrapped in a `<Link>`**, so the chip is rendered as a *sibling* of that link,
  not inside it. A dialog trigger nested in an anchor navigates as well as opening.
