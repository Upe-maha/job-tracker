#Step E — Profile Page Overhaul

Status: planned → implemented in this step.

Six bullets in `md/roadmap.md`, of which three had no implementation at all: the CV/resume, the
GitHub connection, and the avatar's corner edit button. The other three (name/bio/location/phone/
LinkedIn/portfolio, the picture itself, the currency and job-search preferences) already worked and
are only touched where Step E's additions reach them.

## Context

**The resume field existed and nothing used it.** `User.resume` is in the model, in `IUser`, and in
`profileUpdateSchema` as `cloudinaryUrl('Resume')` — a complete, validated, ownership-scoped write
path with no UI and no reader. `/api/upload`'s `ALLOWED_FOLDERS` was `['avatars', 'prep-files']`, so
there was nowhere for a CV to go even if a form had existed. This step is mostly about giving that
field somewhere to come from and somewhere to be seen.

**GitHub was two different features under one roadmap bullet.** "GitHub connect button (links GitHub
profile)" reads as a profile URL alongside LinkedIn, and also as connecting the GitHub *account*.
Both are wanted, and they are unrelated: one is a string, the other is OAuth.

**Step B links providers, but only during sign-in.** `resolveOAuthUser` identifies a user by a
provider-verified email — find, link-by-email, or create. That is the right algorithm for "who is
signing in" and the wrong one for "attach this provider to the person already signed in", which is
what a Connect button means. The distinction is the whole of decision 3 below.

## Decisions locked with the user

1. **The CV persists immediately; the avatar still waits for Save.** The CV card sits outside the
   profile form and carries its own View/Replace/Remove actions, so holding its URL in page state
   until "Save Profile" would mean an upload that visibly succeeded and then silently didn't. The
   avatar keeps today's merge-at-submit behaviour, which is coherent because it sits *inside* the
   form and next to the name it illustrates.

   This is safe against the refetch: `useUpdateProfile` invalidates `['profile']`, but the page's
   hydration guard is `loadedId !== hydratedId`, so a refetch of the same user does **not**
   `form.reset()` over unsaved edits in the form beside it.

2. **A new `resumes` upload folder, PDF-only**, rather than reusing `prep-files`. `prep-files`
   accepts images, and a CV that is a screenshot is not a CV; more to the point the folder allowlist
   is the only thing standing between a caller and a MIME allowlist it didn't intend, and widening
   an existing bucket's meaning is how that protection erodes. Nothing else in the upload route
   changes: `resource_type` is already derived from the sniffed bytes and the face-crop
   transformation is already `avatars`-only.

3. **Connecting GitHub is session-scoped, and must not go through `resolveOAuthUser`.** See below.

4. **`linkedIn`, `portfolio` and `github` become `safeUrl` fields.** They were `text(...)` — bounded
   strings — because nothing rendered them as links. Step E renders all three as anchors, and an
   unvalidated string in an `href` is how `javascript:` gets in. `safeUrl` already exists in
   `schemas/common.ts` and already accepts `''`, so a field can still be cleared. The cost is real
   and accepted: a profile storing a bare `linkedin.com/in/me` now fails validation on its next save
   until it is made absolute.

5. **A provider already linked to a different account is refused, not rebound.** See below.

## Approach

### Connecting GitHub — why not just call `signIn('github')`

Calling `signIn('github')` from a signed-in page runs the same `signIn` callback in `src/lib/auth.ts`
as a fresh sign-in. That callback resolves the user by **provider-verified email**. If the GitHub
account's primary email differs from the email on the job-tracker account — which is common, and is
precisely the case a Connect button exists to serve — `resolveOAuthUser` finds or creates a
*different* user, the callback overwrites `user.id` with that user's `_id`, and the session silently
becomes someone else's while the page still says "Profile". No error is shown, because from the
sign-in flow's point of view nothing went wrong.

So the link flow gets its own branch that never reaches `resolveOAuthUser` or `verifiedProviderEmail`.
Proof that the flow was initiated by the signed-in user rides on Step C's token machinery rather than
a hand-rolled signed cookie:

1. `POST /api/user/link-account` issues an `account_link` token (`issueToken`, 10-minute TTL) and
   sets the raw value in an `httpOnly` cookie. `sameSite: 'lax'` is load-bearing — the cookie has to
   survive the provider's top-level GET redirect back, and `strict` would drop it exactly then.
2. The client then calls `signIn('github', { callbackUrl: '/profile?linked=github' })`.
3. The `signIn` callback reads that cookie. Present ⇒ link branch. `consumeToken` makes it
   single-use and hands back the `userId` it was issued to, which is the identity the link is
   applied to — never the email, never the session as re-derived inside the callback.
4. The cookie is deliberately **not** cleared from inside the callback. The token is already spent,
   so the cookie is inert; mutating cookies from a nested callback inside a route handler is the
   fragile part, and a ten-minute `maxAge` closes it anyway.

**The cookie alone is not enough to take the link branch, and this was the last hole to close.** An
abandoned Connect — redirect to the provider, then Back — leaves the cookie in the browser with its
token *unspent*. On a shared computer, the sequence "victim presses Connect, aborts, signs out,
leaves" would then let the next person to sign in with that provider inside the TTL be linked
straight into the victim's account, since the callback would happily apply the pending intent to
their brand-new provider account. So the branch additionally requires a **live session that matches
the token's `userId`**, read from the session cookie exactly the way `src/middleware.ts` reads it
(`getToken`, with the cookie store rebuilt into the headers it expects, since the callback gets no
request object).

Two directions, both deliberate:

- **No session at all ⇒ fall through** to the ordinary sign-in path rather than fail. With nobody
  signed in, this genuinely *is* an ordinary sign-in, and the stale token just expires. A failure to
  read the cookie is treated the same way, which fails safe: the worst case is that Connect visibly
  stops working, not that a link lands on an unverified identity.
- **A session belonging to someone else ⇒ refuse**, after consuming the token. Burning it on a
  mismatch is the right order; leaving it live would hand the next attempt another try.

`account_link` joins `TOKEN_TYPES`. Because `consumeToken` filters on `type`, an `account_link`
token can never be redeemed at verify-email or reset-password, and neither of those can be spent
here — the same property Step C's `md/step-c-email.md` describes as the security boundary.

### `linkProviderToUser` — three outcomes, and why one of them is a refusal

Written for its one caller. There is no abstraction over providers beyond the `OAuthProvider` union
that already exists; the day a third provider needs linking is the day to find out what it needs.

- The provider account is already linked to **another** user ⇒ `'in_use'`. Never switch sessions,
  never move the link. The unique partial index on `(accounts.provider, accounts.providerAccountId)`
  is what makes this a real invariant rather than a check.
- It is already linked to **this** user ⇒ success, idempotent. A double-click is not an error.
- This user already has a **different** account id for this provider ⇒ `'provider_linked'`, refused.

That last one is the interesting one, because the obvious implementation updates it in place —
which is what `resolveOAuthUser` does on the sign-in path. Here it would mean that connecting while
a different GitHub account happens to be signed into the browser silently rebinds the account, with
no record that the previous one was ever attached and no moment where the user was asked. The
answer for now is Disconnect, then Connect. Replacing a linked account is a distinct operation and
should be named as one if it is ever wanted.

`resolveOAuthUser` keeps its existing behaviour and is not touched. The two functions are allowed to
differ because they answer different questions: sign-in identifies a user from a provider-verified
email; linking attaches a provider to an already-authenticated one. `src/lib/dal/users.test.ts` pins
both, so a later attempt to unify them fails loudly rather than drifting.

### Disconnecting

`DELETE /api/user/accounts/[provider]` refuses when the link is the account's **last sign-in
method** — no password and one linked provider. Removing it would leave a user with no way back in
at all, which is the one failure mode in this step that cannot be undone from the UI. It loads the
user with `.select('+password')` for that check, since `User.password` is `select: false`.

### Previewing the CV, rather than handing it to the browser

The first cut linked straight at the Cloudinary URL with `target="_blank"`. What happens next is the
browser's decision, not the app's: a raw `application/pdf` is often downloaded outright, sometimes
opened in a tab that replaces the page. Either way "which CV is attached?" — the actual question
someone has when they look at their profile — was answered by going to the Downloads folder.

`ResumePreview` renders it in an iframe inside a dialog instead, with **Open** and **Download** both
present in the footer. The trigger comes in as `children` through Radix's `asChild`, because the two
call sites want visibly different buttons around an identical dialog: a compact **View CV** on the
identity card and the row action in the CV panel.

That first cut still didn't work, and the reason took measuring rather than guessing. Against the
real account:

| URL | status | content-type | disposition |
|---|---|---|---|
| extension-less (what we stored) | 200 | `application/octet-stream` | `attachment` |
| same asset named `….pdf` | **401** | `image/gif` | inline |

Cloudinary infers a raw asset's content type from the extension on its public id, and we upload a
base64 data URI — no filename, so the auto-generated id has no extension, so every CV is served as
an octet-stream attachment that no viewer will render. And the obvious fix is a trap: delivery of
`.pdf` URLs is **refused** (401 plus a placeholder GIF) unless the account enables *Allow delivery of
PDF and ZIP files*, which is off by default. Adding the extension turns a file that downloads into a
file that 404s.

So PDFs are served through the app: **`GET /api/files`** fetches the extension-less URL server-side
and re-labels it `application/pdf`, `inline`. `pdfPublicId` still names the asset from the uploaded
filename — so a stored URL reads `.../ada-cv-3f9c1b2e` instead of `.../kmgkwtebjqsomdujtos2` — but
deliberately without the extension.

The forced fix turned out to be the better design anyway:

- **`resolveOwnedFile` makes it ownership-scoped.** Every asset in the app sits under one cloud name,
  so the check has to be "does this exact URL appear on a document this user owns" — the CV on their
  own `User`, or a `prepFiles.url` on their own application. Accepting any well-formed Cloudinary URL
  would let one signed-in user stream another's CV, which would make a route added to *narrow* access
  the thing that widened it. Before this, the CV was readable by anyone holding the link.
- **The filename comes from the server**, never the query string, since it lands in a
  `Content-Disposition` header. Prep files carry a real user-supplied name (sanitised); the CV falls
  back to the public id with the uniqueness suffix stripped.
- **`next.config.ts` needs a `/api/files` exception.** The app-wide `X-Frame-Options: DENY` +
  `frame-ancestors 'none'` also applied to this response, so the preview dialog could not frame it —
  the feature would have failed on our own header. It is `SAMEORIGIN` + `frame-ancestors 'self';
  sandbox` there, and it has to be in the config because config headers win over route headers.
  `sandbox` puts the document in an opaque origin, which is what keeps a PDF-with-JavaScript
  uninteresting now that it is same-origin rather than Cloudinary's problem.
- **The footer still says what to do when the preview doesn't render**, because inline PDF rendering
  is the browser's to provide and a few still won't.

Prep-file PDFs had the identical bug and are fixed by the same route; their rows now open
`PdfPreview` (`src/components/common/PdfPreview.tsx`) instead of an anchor, while link-type prep
files keep the plain anchor they always had.

The CV also appears on the identity card, which is the half of the page that answers "who am I on
paper" — and it is absent, not disabled, when nothing is uploaded.

### Out of scope, deliberately

Replacing a CV **orphans the previous Cloudinary asset**. Deleting it needs the stored `publicId`
that R4 (Cloudinary lifecycle) introduces, and R4 has not started. The upload response already
returns `publicId`; nothing persists it yet, and this step does not start.
