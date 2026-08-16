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

Step C — Email System (nodemailer/SMTP — supersedes the Resend plan below)
  ├── Email verification on register
  │   → send token → user clicks link → account verified
  ├── Forgot password flow
  │   → user enters email → receive reset link → set new password
  └── Password change verification
      → user changes password → confirm via email token first

step D - application and note CRUD
  ├── Add the edit and delete button with functional for application when the appliation is in [id] page
  ├── Also Delete the Note and edit the note functionality in all the notes components
  
  

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
- Step C: complete — see `md/step-c-email.md`. Built on **nodemailer over SMTP**, not Resend, at the
        user's request; the transport is the only part that differs from the plan above. Also closes
        Step A's deferred register enumeration oracle (decision 3 there) and puts the `reset` rate-limit
        preset to work, alongside a new `token` preset for the link-click routes.

Interleaved with the steps above, a separate refactoring pass (security follow-ups, then database
performance) has also landed:
- R1 — trusted-proxy client IP, security headers, external-URL validation: complete
- R2 — paginated `/api/notes` + `lib/dal/`, dashboard aggregation/projection: complete
- R3 — Zod wired end-to-end (routes + forms) and `lib/dal/` extended: complete.
        Server Actions + RSC page loads with React `cache()`: not started — the schemas
        and DAL are shaped so a Server Action can consume both unchanged.
- R4 — Cloudinary lifecycle (`publicId`, signed delivery, upload rate limit): not started, overlaps Step D
- R5 — Vitest suite (schemas, security helpers, parseBody/parseQuery, OAuth email
        verification): complete. GitHub Actions CI: not started.
