#Roadmap — Steps A through H

Each step gets its own `md/step-<x>-*.md` with a detailed plan, written before implementation begins.
Steps are implemented and committed one at a time, in order, with the user reviewing each step.

Step A — Security Layer
  ├── Rate limiting (max 5 attempts per IP per 15 min)
  ├── Input sanitization (block MongoDB operators)
  ├── Account lockout (lock after 5 failed logins)
  ├── CSRF protection on custom API routes
  └── Proper error messages (no info leakage)

Step B — OAuth Login
  ├── Google Gmail login
  ├── GitHub login
  ├── Handle existing email conflict
  │   (user registers with email, then tries Google with same email)
  └── Merge accounts gracefully

Step C — Email System (Resend)
  ├── Email verification on register
  │   → send token → user clicks link → account verified
  ├── Forgot password flow
  │   → user enters email → receive reset link → set new password
  └── Password change verification
      → user changes password → confirm via email token first

Step D — Application & Note CRUD
  ├── Edit + delete buttons on the application [id] page
  ├── Edit a note (delete existed) across all three detail note tabs
  └── Confirm-before-delete, which nothing in the app had

Step E — Profile Page Overhaul
  ├── Profile picture with edit button on corner
  ├── GitHub connect button (links GitHub profile)
  ├── CV/Resume PDF upload
  ├── View CV button (opens PDF in new tab)
  ├── Update CV button (replaces existing)
  └── All user details (name, bio, location, phone, LinkedIn, portfolio)

Step F — PDF in Notes
  ├── Attach PDF to any note
  ├── View attached PDF from note card
  └── Delete PDF attachment from note

Step G — Landing / Home Page
  ├── Hero section (headline + CTA buttons)
  ├── Features section (what the app does)
  ├── How it works section (3 steps)
  ├── Tech stack / built with section
  └── Footer with links

Step H — Mobile Responsive
  ├── Sidebar becomes a drawer on mobile
  ├── Hamburger menu button in header
  ├── Kanban board scrolls horizontally on mobile
  ├── All modals fit on small screens
  ├── Dashboard grid stacks on mobile
  └── Detail page tabs scroll on mobile

Step I — Security — Session Management
  ├── Session expiry (7 days)
  ├── Session invalidation on password change
  │   (all other sessions logged out)
  └── Remember me option on login

## Status
- Step A: complete — see `md/step-a-security.md`
- Step B: complete — see `md/step-b-oauth.md`
- Step C: complete — see `md/step-c-email.md`. Mail goes out through the **Resend SDK over HTTPS**
        (`RESEND_API_KEY` + `EMAIL_FROM`), as this roadmap originally planned. It was built on
        nodemailer/SMTP first and moved to Resend afterwards; `nodemailer` is no longer a dependency,
        and `md/step-c-email.md` records that detour. Also closes
        Step A's deferred register enumeration oracle (decision 3 there) and puts the `reset` rate-limit
        preset to work, alongside a new `token` preset for the link-click routes.
- Step D: complete — see `md/step-d-crud.md`. Adds `updateSubdocument` to the DAL (the third
        subdocument operation, alongside push and pull) and a `PUT` on the notes route; gives
        `companyLogo` a UI for the first time; and puts every delete behind a confirmation.
- Step E: complete — see `md/step-e-profile.md`. Gives `User.resume` (which existed, validated and
        unwritten) an upload/view/replace/remove UI over a new PDF-only `resumes` upload folder;
        adds a `github` profile URL and turns the three link fields into validated anchors; and adds
        **session-scoped OAuth linking** — Connect/Disconnect a provider from the profile page,
        which is a different operation from Step B's sign-in linking and deliberately does not share
        its resolve-by-email path. New `account_link` token type, `linkProviderToUser` /
        `unlinkProviderFromUser` in the DAL, and `tests/integration/server/data/users.test.ts` pinning both
        them and Step B's unchanged behaviour.

- Step F: complete — see `md/step-f-notes-pdf.md`. One optional `{ url, name }` attachment per note,
        managed entirely inside `NoteModal` and saved through the existing note `POST`/`PUT` — no new
        API route, since `/api/files` (Step E) already serves an owned PDF and `updateSubdocument`
        (Step D) already writes `notes.$.attachment`. The load-bearing change is a third branch in
        `resolveOwnedFile`: without it every attachment preview 404s, because `/api/files` serves
        nothing it cannot prove the caller owns. New `note-files` upload folder, one more projected
        field in `fetchNotesFeed`, and `tests/integration/server/data/notes.test.ts`.

- Step G: complete — see `md/step-g-landing.md`. `/` was a developer placeholder *and* unreachable,
        since middleware redirected it for everyone; only the signed-out half of that redirect came
        out, so signed-in users still land on `/dashboard`. The page is **registry-driven**:
        `components/landing/sections.ts` is the one place order lives, and every section takes no
        props and imports its own copy, so reordering or dropping one is a one-line change. Visual
        language follows the supplied reference (glass panel on a gradient backdrop, alternating card
        grid, pills); the content follows the landing-page formula, except that **testimonials were
        refused** — the app has no users, so the proof section carries checkable engineering facts
        instead of invented quotes. The About copy ships as a marked `PLACEHOLDER` for the owner to
        write.

- Step H: complete — see `md/step-h-mobile.md`. Sidebar becomes a drawer below `lg` over a new
        vendored `ui/sheet.tsx`; the header drops its fixed 256px brand block for a hamburger plus a
        truncated page title; the detail page's five tabs scroll; modals use `sm:max-w-*` so the
        primitive's mobile guard governs below `sm`; and the shell moves from `h-screen` to `h-dvh`.
        Two of the six roadmap bullets were already satisfied (Kanban `ScrollArea`, `PageGrid`
        stacking) and were measured rather than "fixed". Two bugs outside the list were found by
        measuring: the Kanban drag handle was `opacity-0 group-hover:` and so did not exist on
        touch, and control heights were a desktop density at every width. Verified by
        `scripts/responsive-check.mjs` — 36 route/viewport combinations, all passing.

- Step I: complete — see `md/step-i-sessions.md`. Rolling idle timeouts (1 day, 7 with "Remember
        me") carried in an `idleMs` claim rather than the cookie, since a JWT strategy has only one
        cookie lifetime; revocation on password change, throttled to ~60s by a `checkedAt` claim
        because the `jwt` callback runs on every `auth()` call. Consumes `passwordChangedAt`, which
        has been written since Step C for exactly this. **`iat` cannot do the comparison** — the
        token is re-encoded on every session read, so it always looks newer than the change; the
        token carries its own `signedInAt` instead, and `CLAUDE.md`'s note predicting `iat` was
        corrected. Two bugs found by testing rather than reading: a revoked session hit
        `ERR_TOO_MANY_REDIRECTS` between middleware and the dashboard layout (now
        `/api/auth/session-ended` clears the cookie), and the tab performing a password change
        revoked itself until the confirm route re-issued its cookie.

Interleaved with the steps above, a separate refactoring pass (security follow-ups, then database
performance) has also landed:
- R1 — trusted-proxy client IP, security headers, external-URL validation: complete
- R2 — paginated `/api/notes` + `server/data/`, dashboard aggregation/projection: complete
- R3 — Zod wired end-to-end (routes + forms) and `server/data/` extended: complete.
        Server Actions + RSC page loads with React `cache()`: not started — the schemas
        and DAL are shaped so a Server Action can consume both unchanged.
- R4 — Cloudinary lifecycle (`publicId`, signed delivery, upload rate limit): not started, overlaps Step D.
        Two callers now wait on it: replacing a CV orphans the previous asset (Step E), and so does
        replacing or removing a note attachment — or abandoning the note modal after an upload
        (Step F). All of those need the stored `publicId` R4 introduces, and they are deliberately
        handled *together* there rather than one path at a time.
- R5 — Vitest suite (schemas, security helpers, parseBody/parseQuery, OAuth email
        verification): complete. GitHub Actions CI: not started.

## Follow-ups

- **Make `scripts/responsive-check.mjs` runnable again.** Responsive browser verification was
        not rerun during the 2026-08-18 restructure because Playwright is not installed and the
        check requires an authenticated session cookie. Production build succeeded; browser-level
        layout assertions remain unverified since Step H.
        Needs: Playwright (a global copy via `PLAYWRIGHT_PATH`, or `npm i -D playwright`) and a
        session cookie in `RESPONSIVE_CHECK_TOKEN`, taken by hand from a logged-in browser.
        Deliberately its own task — adding a browser driver and session plumbing is new
        infrastructure, and no goal of the restructure required it.
