// src/shared/schemas/domain.test.ts
//
// Covers the behaviours the route migration depends on. Each of these replaces
// a hand-rolled check that the routes are about to delete, so a regression here
// is a security or data-integrity regression, not just a failing assertion.
import { describe, expect, it } from 'vitest'
import {
  applicationCreateSchema,
  applicationStatusSchema,
  applicationUpdateSchema,
} from './application'
import {
  noteCreateSchema,
  noteUpdateSchema,
  notesQuerySchema,
  NOTES_PAGE_SIZE,
} from './note'
import { contactCreateSchema } from './contact'
import { prepFileCreateSchema } from './prep-file'
import { passwordChangeSchema, profileUpdateSchema } from './user'
import { loginSchema, registerSchema } from './auth'

const minimalApplication = { company: 'Acme', role: 'Engineer' }

describe('applicationCreateSchema', () => {
  it('fills every optional field from defaults', () => {
    const parsed = applicationCreateSchema.parse(minimalApplication)
    expect(parsed).toMatchObject({
      status: 'wishlist',
      jobUrl: '',
      workMode: '',
      jobType: '',
      salaryCurrency: 'USD',
      salaryMin: null,
      tags: [],
    })
  })

  it('requires company and role', () => {
    expect(applicationCreateSchema.safeParse({ company: 'Acme' }).success).toBe(false)
    expect(applicationCreateSchema.safeParse({ ...minimalApplication, company: '  ' }).success).toBe(
      false,
    )
  })

  it('rejects an invalid status, work mode and job type', () => {
    for (const bad of [{ status: 'nope' }, { workMode: 'nope' }, { jobType: 'nope' }]) {
      expect(applicationCreateSchema.safeParse({ ...minimalApplication, ...bad }).success).toBe(false)
    }
  })

  // '' is a real, storable member of these two — the "not specified" option.
  it("accepts '' for workMode and jobType but not for status", () => {
    expect(
      applicationCreateSchema.safeParse({ ...minimalApplication, workMode: '', jobType: '' }).success,
    ).toBe(true)
    expect(applicationCreateSchema.safeParse({ ...minimalApplication, status: '' }).success).toBe(
      false,
    )
  })

  it('strips unknown keys, so user/_id cannot be mass-assigned', () => {
    const parsed = applicationCreateSchema.parse({
      ...minimalApplication,
      user: 'someone-elses-id',
      _id: 'forged',
      notes: [{ content: 'x' }],
    })
    expect(parsed).not.toHaveProperty('user')
    expect(parsed).not.toHaveProperty('_id')
    expect(parsed).not.toHaveProperty('notes')
  })

  it('enforces the tag count and per-tag length caps', () => {
    expect(
      applicationCreateSchema.safeParse({ ...minimalApplication, tags: Array(51).fill('a') }).success,
    ).toBe(false)
    expect(
      applicationCreateSchema.safeParse({ ...minimalApplication, tags: ['a'.repeat(41)] }).success,
    ).toBe(false)
  })

  // The old route accepted a bare string and silently produced [].
  it('rejects a non-array tags value', () => {
    expect(applicationCreateSchema.safeParse({ ...minimalApplication, tags: 'javascript' }).success).toBe(
      false,
    )
  })

  it('rejects salaryMin greater than salaryMax', () => {
    const result = applicationCreateSchema.safeParse({
      ...minimalApplication,
      salaryMin: 90,
      salaryMax: 10,
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].path).toEqual(['salaryMax'])
  })

  it('allows one-sided salary bounds', () => {
    expect(applicationCreateSchema.safeParse({ ...minimalApplication, salaryMin: 90 }).success).toBe(
      true,
    )
  })
})

describe('applicationUpdateSchema', () => {
  // .partial() does NOT strip a .default(), which is why create and update are
  // built from one undefaulted field map. If this breaks, a request that never
  // mentions status silently resets it to 'wishlist'.
  it('does not inject defaults for absent fields', () => {
    const parsed = applicationUpdateSchema.parse({ company: 'Acme' })
    expect(Object.keys(parsed)).toEqual(['company'])
  })

  it('rejects an empty update', () => {
    expect(applicationUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('rejects unknown-only payloads, since unknown keys are stripped first', () => {
    expect(applicationUpdateSchema.safeParse({ user: 'x', _id: 'y' }).success).toBe(false)
  })

  it('still applies the salary ordering rule', () => {
    expect(applicationUpdateSchema.safeParse({ salaryMin: 90, salaryMax: 10 }).success).toBe(false)
  })

  it('coerces a date string and rejects an unparseable one', () => {
    expect(applicationUpdateSchema.parse({ deadline: '2026-03-01' }).deadline).toBeInstanceOf(Date)
    expect(applicationUpdateSchema.safeParse({ deadline: 'nonsense' }).success).toBe(false)
  })
})

describe('applicationStatusSchema', () => {
  it('accepts a valid status and rejects anything else', () => {
    expect(applicationStatusSchema.parse({ status: 'offer' })).toEqual({ status: 'offer' })
    expect(applicationStatusSchema.safeParse({ status: 'nope' }).success).toBe(false)
    expect(applicationStatusSchema.safeParse({}).success).toBe(false)
  })
})

describe('noteCreateSchema', () => {
  it('defaults type to general and the optional fields to null/empty', () => {
    expect(noteCreateSchema.parse({ content: 'hi' })).toMatchObject({
      type: 'general',
      interviewRound: null,
      outcome: null,
      whatWentWrong: '',
      whatToImprove: '',
    })
  })

  it('requires non-empty content within the length cap', () => {
    expect(noteCreateSchema.safeParse({ content: '   ' }).success).toBe(false)
    expect(noteCreateSchema.safeParse({ content: 'a'.repeat(20001) }).success).toBe(false)
  })

  // .nullish() — an explicit null has always meant "not applicable" and must be
  // accepted alongside an absent key.
  it('accepts an explicit null for interviewRound and outcome', () => {
    expect(
      noteCreateSchema.safeParse({ content: 'hi', interviewRound: null, outcome: null }).success,
    ).toBe(true)
  })

  it('rejects invalid enum members', () => {
    expect(noteCreateSchema.safeParse({ content: 'hi', type: 'nope' }).success).toBe(false)
    expect(noteCreateSchema.safeParse({ content: 'hi', outcome: 'maybe' }).success).toBe(false)
  })

  // Step F. The attachment url is also the ownership key /api/files matches on,
  // so what may be stored here is what may later be served.
  describe('attachment', () => {
    const url =
      'https://res.cloudinary.com/demo/raw/upload/v1/job-tracker/note-files/take-home-ffeeddcc'

    it('defaults to null and accepts an explicit null', () => {
      expect(noteCreateSchema.parse({ content: 'hi' }).attachment).toBeNull()
      expect(
        noteCreateSchema.safeParse({ content: 'hi', attachment: null }).success,
      ).toBe(true)
    })

    it('accepts an uploaded file with a name', () => {
      expect(
        noteCreateSchema.safeParse({
          content: 'hi',
          attachment: { url, name: 'Take home' },
        }).success,
      ).toBe(true)
    })

    it('rejects a url from anywhere but our own uploads', () => {
      expect(
        noteCreateSchema.safeParse({
          content: 'hi',
          attachment: { url: 'https://evil.test/x.pdf', name: 'X' },
        }).success,
      ).toBe(false)
    })

    it('rejects an empty url — the cloudinaryUrl("") trap', () => {
      // isCloudinaryUrl returns true for '', meaning "cleared", which is right
      // for a field that can be blanked and wrong here: an attachment either
      // has a url or is null. Without the explicit min(1) this would store an
      // attachment pointing at nothing.
      expect(
        noteCreateSchema.safeParse({ content: 'hi', attachment: { url: '', name: 'X' } })
          .success,
      ).toBe(false)
    })

    it('requires a name, and bounds it', () => {
      expect(
        noteCreateSchema.safeParse({ content: 'hi', attachment: { url, name: '  ' } })
          .success,
      ).toBe(false)
      expect(
        noteCreateSchema.safeParse({
          content: 'hi',
          attachment: { url, name: 'a'.repeat(201) },
        }).success,
      ).toBe(false)
    })

    it('is left alone by an update that omits it', () => {
      // The route $sets only the keys it receives, so an absent attachment must
      // not appear in the parsed output and clear a note's existing file.
      const parsed = noteUpdateSchema.parse({
        noteId: 'a'.repeat(24),
        content: 'edited',
      })
      expect(parsed).not.toHaveProperty('attachment')
    })

    it('is cleared by an update that sends null', () => {
      expect(
        noteUpdateSchema.parse({ noteId: 'a'.repeat(24), attachment: null }).attachment,
      ).toBeNull()
    })
  })
})

describe('noteUpdateSchema', () => {
  const noteId = '507f1f77bcf86cd799439011'

  it('requires a valid noteId', () => {
    expect(noteUpdateSchema.safeParse({ content: 'hi' }).success).toBe(false)
    expect(noteUpdateSchema.safeParse({ noteId: 'nope', content: 'hi' }).success).toBe(false)
  })

  // noteId always occupies one key, which is why the refine counts > 1. A
  // request naming only the note is a no-op the route should never run.
  it('rejects a noteId with no updatable field', () => {
    const result = noteUpdateSchema.safeParse({ noteId })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('No valid fields to update')
  })

  // Partial is what makes an absent field mean "leave it alone" rather than
  // "clear it" — the route $sets only the keys it receives.
  it('accepts a single field on its own', () => {
    expect(noteUpdateSchema.safeParse({ noteId, content: 'edited' }).success).toBe(true)
    expect(noteUpdateSchema.safeParse({ noteId, outcome: 'passed' }).success).toBe(true)
  })

  it('still enforces the field rules it inherits', () => {
    expect(noteUpdateSchema.safeParse({ noteId, content: '   ' }).success).toBe(false)
    expect(noteUpdateSchema.safeParse({ noteId, type: 'nope' }).success).toBe(false)
    expect(noteUpdateSchema.safeParse({ noteId, interviewRound: 'round_9' }).success).toBe(false)
  })

  it('accepts explicit nulls, the same way create does', () => {
    expect(
      noteUpdateSchema.safeParse({ noteId, interviewRound: null, outcome: null }).success,
    ).toBe(true)
  })
})

describe('notesQuerySchema', () => {
  it('defaults page and limit when the keys are absent', () => {
    expect(notesQuerySchema.parse({})).toEqual({ page: 0, limit: NOTES_PAGE_SIZE })
  })

  it('coerces numeric strings from the query string', () => {
    expect(notesQuerySchema.parse({ page: '2', limit: '5' })).toMatchObject({ page: 2, limit: 5 })
  })

  it('rejects a limit over the cap and a negative page', () => {
    expect(notesQuerySchema.safeParse({ limit: '51' }).success).toBe(false)
    expect(notesQuerySchema.safeParse({ page: '-1' }).success).toBe(false)
  })

  it('rejects non-integers', () => {
    expect(notesQuerySchema.safeParse({ page: '1.5' }).success).toBe(false)
    expect(notesQuerySchema.safeParse({ limit: 'abc' }).success).toBe(false)
  })

  // Callers must pass `get(k) ?? undefined`: a raw null coerces to 0 and would
  // make limit zero rather than the default. parseQuery centralizes this.
  it('turns an explicit null limit into 0, which the min(1) rule then rejects', () => {
    expect(notesQuerySchema.safeParse({ limit: null }).success).toBe(false)
  })
})

describe('contactCreateSchema', () => {
  it('requires a name and defaults the rest to empty', () => {
    expect(contactCreateSchema.parse({ name: 'Ada' })).toEqual({
      name: 'Ada',
      role: '',
      email: '',
      phone: '',
      linkedIn: '',
    })
    expect(contactCreateSchema.safeParse({}).success).toBe(false)
  })

  it('allows a blank email but rejects a malformed one', () => {
    expect(contactCreateSchema.safeParse({ name: 'Ada', email: '' }).success).toBe(true)
    expect(contactCreateSchema.safeParse({ name: 'Ada', email: 'nope' }).success).toBe(false)
  })

  // Deliberately a plain bounded string: users have saved bare "in/username".
  it('accepts a non-URL linkedIn handle', () => {
    expect(contactCreateSchema.safeParse({ name: 'Ada', linkedIn: 'in/ada' }).success).toBe(true)
  })
})

describe('prepFileCreateSchema', () => {
  it('requires a pdf url to be a Cloudinary upload', () => {
    expect(
      prepFileCreateSchema.safeParse({
        name: 'CV',
        type: 'pdf',
        url: 'https://res.cloudinary.com/demo/a.pdf',
      }).success,
    ).toBe(true)
    expect(
      prepFileCreateSchema.safeParse({ name: 'CV', type: 'pdf', url: 'https://evil.test/a.pdf' })
        .success,
    ).toBe(false)
  })

  it('allows any safe http(s) url for a link', () => {
    expect(
      prepFileCreateSchema.safeParse({ name: 'Docs', type: 'link', url: 'http://a.com' }).success,
    ).toBe(true)
    expect(
      prepFileCreateSchema.safeParse({ name: 'X', type: 'link', url: 'javascript:alert(1)' }).success,
    ).toBe(false)
  })

  // Both url helpers treat '' as "cleared" and return true — wrong here, where
  // url is required. Hence the explicit non-empty guard in the schema.
  it('rejects an empty url for both types', () => {
    expect(prepFileCreateSchema.safeParse({ name: 'X', type: 'pdf', url: '' }).success).toBe(false)
    expect(prepFileCreateSchema.safeParse({ name: 'X', type: 'link', url: '' }).success).toBe(false)
  })

  it('rejects an unknown type', () => {
    expect(
      prepFileCreateSchema.safeParse({ name: 'X', type: 'doc', url: 'https://a.com' }).success,
    ).toBe(false)
  })
})

describe('profileUpdateSchema', () => {
  // Replaces PROFILE_UPDATABLE + validateProfileUpdate wholesale.
  it('strips email, password and lockout fields', () => {
    const parsed = profileUpdateSchema.parse({
      name: 'Ada',
      email: 'attacker@evil.test',
      password: 'hunter2',
      failedLoginAttempts: 0,
      lockUntil: null,
    })
    expect(parsed).toEqual({ name: 'Ada' })
  })

  it('rejects an empty update', () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('enforces the avatar host allowlist and the resume upload host', () => {
    expect(profileUpdateSchema.safeParse({ photo: 'https://evil.test/a.jpg' }).success).toBe(false)
    expect(
      profileUpdateSchema.safeParse({ photo: 'https://lh3.googleusercontent.com/a' }).success,
    ).toBe(true)
    expect(profileUpdateSchema.safeParse({ resume: 'https://evil.test/cv.pdf' }).success).toBe(false)
  })

  it('accepts a Cloudinary resume and the empty string that clears it', () => {
    expect(
      profileUpdateSchema.safeParse({
        resume: 'https://res.cloudinary.com/demo/raw/upload/cv.pdf',
      }).success,
    ).toBe(true)
    // '' is how ResumeCard's Remove works — there is no delete route.
    expect(profileUpdateSchema.safeParse({ resume: '' }).success).toBe(true)
  })

  // Step E renders these three as anchors, so they are safeUrl rather than the
  // bounded text they used to be: an unvalidated string in an href is how
  // javascript: gets in.
  it('rejects a non-URL in the three link fields', () => {
    for (const field of ['linkedIn', 'portfolio', 'github'] as const) {
      expect(profileUpdateSchema.safeParse({ [field]: 'javascript:alert(1)' }).success).toBe(false)
      expect(profileUpdateSchema.safeParse({ [field]: 'linkedin.com/in/ada' }).success).toBe(false)
      expect(profileUpdateSchema.safeParse({ [field]: 'https://github.com/ada' }).success).toBe(true)
      // Still clearable.
      expect(profileUpdateSchema.safeParse({ [field]: '' }).success).toBe(true)
    }
  })
})

describe('passwordChangeSchema', () => {
  it('rejects a no-op change', () => {
    expect(
      passwordChangeSchema.safeParse({ currentPassword: 'abcdef', newPassword: 'abcdef' }).success,
    ).toBe(false)
  })

  it('applies the strength policy to the new password only', () => {
    // A short *current* password must not be rejected — it is an existing
    // secret, possibly created under an older rule.
    expect(
      passwordChangeSchema.safeParse({ currentPassword: 'old', newPassword: 'abcdef' }).success,
    ).toBe(true)
    expect(
      passwordChangeSchema.safeParse({ currentPassword: 'old', newPassword: 'abc' }).success,
    ).toBe(false)
  })
})

describe('auth schemas', () => {
  it('registerSchema normalizes email and enforces the password policy', () => {
    const parsed = registerSchema.parse({ name: ' Ada ', email: ' A@B.CO ', password: 'abcdef' })
    expect(parsed).toEqual({ name: 'Ada', email: 'a@b.co', password: 'abcdef' })
    expect(
      registerSchema.safeParse({ name: 'Ada', email: 'a@b.co', password: 'abc' }).success,
    ).toBe(false)
  })

  // Applying the 6-char policy here would leak it and lock out older accounts.
  it('loginSchema only checks that a password was typed', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false)
  })
})
