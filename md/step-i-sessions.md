#Step I — Session Management

Status: planned → implemented in this step.

Three things: sessions expire, a password change signs out every *other* session, and login offers
"Remember me".

## Context

Sessions were JWT-strategy with **no `maxAge`**, so they inherited NextAuth's 30-day default and
nothing else bounded them. `User.passwordChangedAt` had been written on every password change since
Step C — by both `auth/confirm-password-change` and `auth/reset-password` — and read by nothing.
`CLAUDE.md` said so deliberately: a field introduced at *this* step would have had no baseline,
leaving every pre-existing session permanently un-invalidatable. This is the step that consumes it.

## Decisions locked with the user

1. **Throttled revalidation, ~60s.** `auth()` runs the `jwt` callback on *every* call — every API
   route through `guard()` and every dashboard page load — so a DB read there is a per-request cost.
   A `checkedAt` claim bounds it to one read per minute per session. The trade, stated rather than
   hidden: a stolen session survives up to 60 seconds after the password changes.
2. **Rolling (idle) expiry.** A daily user is never signed out; an abandoned session dies on
   schedule.
3. **Remember me: unchecked = 1 day, checked = 7 days**, both as idle timeouts.

## `iat` cannot do this job

The obvious implementation — compare the JWT's `iat` against `passwordChangedAt` — **cannot work**,
and `CLAUDE.md` predicted exactly that approach. `@auth/core`'s session action re-encodes the token
on *every* read:

```js
// node_modules/@auth/core/lib/actions/session.js
const newToken = await jwt.encode({ ...jwt, token, salt })
const sessionCookies = sessionStore.chunk(newToken, { expires: newExpires })
```

So `iat` advances continuously and the session always looks newer than the password change. The
check would compile, ship, and silently never fire — the worst kind of security bug, one that looks
implemented. The token therefore carries its own **`signedInAt`**, written once at sign-in and never
refreshed.

The same re-encoding is what makes the rolling timeout free: a `lastSeen` claim updates on every
request with no extra machinery.

## Legacy tokens

This step changes the shape and meaning of an already-issued JWT, and `AUTH_SECRET` does not change
— so every cookie in the wild stays valid and decodable, and arrives at the new callback with all
four claims `undefined`. There is no version bump that makes them go away.

The defaults are conservative in each direction, and they live inside `sessionVerdict` rather than
at the call site, which is what makes them testable:

| Missing claim | Treated as | Why |
|---|---|---|
| `signedInAt` | `0` (epoch) | Its real age is unknowable. Assuming it is *new* would let a token issued before the deploy — including a stolen one — outlive a password change, defeating the feature for exactly the sessions whose provenance cannot be verified. |
| `idleMs` | 1 day | Nobody ticked a box on a session that predates the box. |
| `lastSeen` | now, then stamped | A session cannot be punished for a timestamp we never recorded. |
| `checkedAt` | `0` | Revalidate on next use rather than granting a fresh grace period to a session we know nothing about. |

**Consequence, stated because it is user-visible: anyone who has ever changed or reset their password
is signed out once on deploy.** Everyone else is adopted silently. That asymmetry is the design —
those are the sessions that cannot be proven newer than the change.

Rotating `AUTH_SECRET` was rejected (it signs *everyone* out and breaks the Step C token flows that
share the secret), as was treating missing claims as expired (same outage, to solve a problem only
some sessions have).

## The redirect loop this created, and the route that ends it

Step I makes it possible for a cookie to be **decodable but rejected**, and that splits two notions
of "signed in" that had always agreed:

- `middleware.ts` asks *does this JWT decode?* — for a revoked session, yes.
- `(dashboard)/layout.tsx` asks `auth()`, which runs the policy — no.

So the layout redirected to `/login`, middleware saw a valid-looking cookie and bounced straight
back to `/dashboard`, and the browser gave up with **`ERR_TOO_MANY_REDIRECTS`**. A revoked user was
worse off than before the feature existed. A server component cannot clear a cookie, so nothing in
that loop could break it.

`GET /api/auth/session-ended` can, because a route handler can set cookies. The layout redirects
there instead of to `/login`; it clears both cookie names (the `__Secure-` prefix depends on
deployment, and missing one leaves the loop intact) and forwards to `/login?reason=session_ended`.
The redirect only ever fires in the mismatch case, since middleware already turns away requests with
no cookie at all.

This was found by testing, not by reading — the unit tests were all passing at the time.

## Where the claims actually persist

`auth()` in a server component **cannot write cookies**, so the claims the `jwt` callback updates on
a page render exist only for that request. What persists them is the client `SessionProvider` hitting
`/api/auth/session`, which is the one path where `@auth/core` re-encodes the token and re-sets the
cookie. Measured: two calls on a dashboard load, after which the cookie carries the full claim set
and `Max-Age` is the 7-day outer bound.

The honest consequence for the throttle: `checkedAt` advances whenever the session endpoint runs, and
between those points a long run of API-only requests can each see a stale `checkedAt` and revalidate.
The read is a single indexed lookup projected to one field, so the worst case is small — but "one
database read per session per minute" is the typical case, not a guarantee.

## Shape

`src/shared/security/sessionPolicy.ts` is pure — no imports beyond types — so it sits in the isomorphic
tier next to `sanitize.ts` and `loginErrors.ts` and is directly testable by the Node-only Vitest
suite. Unlike Steps G and H, this step's core logic *is* unit-testable, and that is where the
verification weight sits rather than on a browser sweep.

`auth.ts` keeps only the I/O: read the user when the policy asks for it, and act on the verdict.
Returning `null` from the `jwt` callback is what ends a session — confirmed against the installed
source, where a null token reaches `sessionStore.clean()` and the cookie is cleared.

The revalidation read **fails open**, matching the `read` rate-limit tier: a database blip must not
sign the entire userbase out. It leaves a window of one revalidation period, closed by the next
successful request.

## Verified

Unit (20 new tests, `sessionPolicy.test.ts`): the idle boundary in both directions, the throttle
boundary, revocation, the session that performed the change surviving, a null `passwordChangedAt`
never revoking, clock skew, and one test per row of the legacy-token table.

In a browser, against the real `@auth/core` encode/decode path:

- A legacy `{ id, photo }` token on an account with **no** password change → adopted, stays signed
  in. The same shape on an account **with** one → signed out, cookie cleared, no redirect loop.
- Remember me unchecked → `idleMs` of one day; checked → seven. Cookie `Max-Age` is seven days in
  both, since the shorter timeout lives in the claim rather than the cookie.
- Two sessions for one user; the password change confirmed from A. **A stayed signed in and B was
  signed out** — after the revalidation window, not before, which is the 60-second trade-off being
  visible rather than hidden.
