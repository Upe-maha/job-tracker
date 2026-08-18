// src/server/data/files.integration.test.ts
//
// resolveOwnedFile is the only thing standing between /api/files and "any
// signed-in user can stream any other user's CV" — every asset in the app lives
// under one Cloudinary cloud name, so the URL itself proves nothing. That makes
// it an ownership-scoped *query*, which is the same reason tokens and the
// linking helpers get a real mongod rather than a mocked model.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import User from '@/models/User'
import Application from '@/models/Application'
import { resolveOwnedFile } from './files'

let mongod: MongoMemoryServer

const CV = 'https://res.cloudinary.com/demo/raw/upload/v1/job-tracker/resumes/ada-cv-3f9c1b2e'
const PREP = 'https://res.cloudinary.com/demo/raw/upload/v1/job-tracker/prep-files/notes-aabbccdd'

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}, 60_000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

afterEach(async () => {
  await Promise.all([User.deleteMany({}), Application.deleteMany({})])
})

function seedUser(email: string, resume = '') {
  return User.create({ name: 'Ada', email, resume })
}

function seedApplication(
  userId: mongoose.Types.ObjectId,
  prepFiles: unknown[] = [],
  notes: unknown[] = [],
) {
  return Application.create({
    user: userId,
    company: 'Acme',
    role: 'Engineer',
    prepFiles,
    notes,
  })
}

describe('resolveOwnedFile — the CV', () => {
  it('resolves the owner’s own resume', async () => {
    const user = await seedUser('ada@example.com', CV)
    await expect(resolveOwnedFile(user._id, CV)).resolves.toEqual({ filename: 'ada-cv.pdf' })
  })

  it('refuses another user’s resume', async () => {
    // The whole point of the helper. Both users are signed in and both URLs are
    // well-formed Cloudinary URLs under the same cloud name.
    await seedUser('ada@example.com', CV)
    const other = await seedUser('eve@example.com')

    await expect(resolveOwnedFile(other._id, CV)).resolves.toBeNull()
  })

  it('refuses a URL nobody has stored', async () => {
    const user = await seedUser('ada@example.com', CV)
    await expect(
      resolveOwnedFile(user._id, 'https://res.cloudinary.com/demo/raw/upload/v1/nothing-here'),
    ).resolves.toBeNull()
  })

  it('refuses an empty url without querying', async () => {
    const user = await seedUser('ada@example.com', CV)
    await expect(resolveOwnedFile(user._id, '')).resolves.toBeNull()
  })

  it('stops resolving once the CV is removed', async () => {
    const user = await seedUser('ada@example.com', CV)
    await User.updateOne({ _id: user._id }, { $set: { resume: '' } })

    await expect(resolveOwnedFile(user._id, CV)).resolves.toBeNull()
  })
})

describe('resolveOwnedFile — prep files', () => {
  it('resolves a prep file on the user’s own application, named from the subdocument', async () => {
    const user = await seedUser('ada@example.com')
    await seedApplication(user._id, [{ name: 'System design notes', type: 'pdf', url: PREP }])

    await expect(resolveOwnedFile(user._id, PREP)).resolves.toEqual({
      filename: 'System design notes.pdf',
    })
  })

  it('refuses a prep file on someone else’s application', async () => {
    const owner = await seedUser('ada@example.com')
    await seedApplication(owner._id, [{ name: 'Notes', type: 'pdf', url: PREP }])
    const other = await seedUser('eve@example.com')
    await seedApplication(other._id, [])

    await expect(resolveOwnedFile(other._id, PREP)).resolves.toBeNull()
  })

  it('picks the matching file out of a document holding several', async () => {
    // The positional projection has to return the file that matched, not the
    // first one on the document.
    const user = await seedUser('ada@example.com')
    await seedApplication(user._id, [
      { name: 'Other', type: 'pdf', url: `${PREP}-other` },
      { name: 'Wanted', type: 'pdf', url: PREP },
    ])

    await expect(resolveOwnedFile(user._id, PREP)).resolves.toEqual({ filename: 'Wanted.pdf' })
  })

  it('sanitises the stored name, which ends up in a response header', async () => {
    const user = await seedUser('ada@example.com')
    await seedApplication(user._id, [
      { name: 'quote" ; drop\r\nheader', type: 'pdf', url: PREP },
    ])

    const resolved = await resolveOwnedFile(user._id, PREP)
    expect(resolved!.filename).not.toMatch(/["\r\n;]/)
  })

  it('does not double the extension on a name that already has one', async () => {
    const user = await seedUser('ada@example.com')
    await seedApplication(user._id, [{ name: 'brief.pdf', type: 'pdf', url: PREP }])

    await expect(resolveOwnedFile(user._id, PREP)).resolves.toEqual({ filename: 'brief.pdf' })
  })
})

// ─── Step F ───────────────────────────────────────────
//
// Without this branch every note attachment 404s, because /api/files serves
// nothing it cannot prove the caller owns — the feature would be complete and
// non-functional. And a missing `user:` on the filter would do the opposite:
// serve any note's PDF to any signed-in caller. Both directions are pinned.
describe('resolveOwnedFile — note attachments', () => {
  const NOTE_PDF =
    'https://res.cloudinary.com/demo/raw/upload/v1/job-tracker/note-files/round-2-ffeeddcc'

  function noteWith(url: string, name: string) {
    return { type: 'general', content: 'Some note', attachment: { url, name } }
  }

  it('resolves an attachment on the user’s own note, named from the subdocument', async () => {
    const user = await seedUser('ada@example.com')
    await seedApplication(user._id, [], [noteWith(NOTE_PDF, 'Round 2 take-home')])

    await expect(resolveOwnedFile(user._id, NOTE_PDF)).resolves.toEqual({
      filename: 'Round 2 take-home.pdf',
    })
  })

  it('refuses an attachment on someone else’s note', async () => {
    const owner = await seedUser('ada@example.com')
    await seedApplication(owner._id, [], [noteWith(NOTE_PDF, 'Private')])
    const other = await seedUser('eve@example.com')
    await seedApplication(other._id, [], [])

    await expect(resolveOwnedFile(other._id, NOTE_PDF)).resolves.toBeNull()
  })

  it('picks the matching note out of an application holding several', async () => {
    const user = await seedUser('ada@example.com')
    await seedApplication(
      user._id,
      [],
      [
        noteWith(`${NOTE_PDF}-other`, 'Other'),
        { type: 'general', content: 'No attachment here' },
        noteWith(NOTE_PDF, 'Wanted'),
      ],
    )

    await expect(resolveOwnedFile(user._id, NOTE_PDF)).resolves.toEqual({
      filename: 'Wanted.pdf',
    })
  })

  it('sanitises the stored name, which ends up in a response header', async () => {
    const user = await seedUser('ada@example.com')
    await seedApplication(user._id, [], [noteWith(NOTE_PDF, 'quote" ; drop\r\nheader')])

    const resolved = await resolveOwnedFile(user._id, NOTE_PDF)
    expect(resolved!.filename).not.toMatch(/["\r\n;]/)
  })

  it('stops resolving once the attachment is removed', async () => {
    const user = await seedUser('ada@example.com')
    const app = await seedApplication(user._id, [], [noteWith(NOTE_PDF, 'Temp')])
    await Application.updateOne(
      { _id: app._id },
      { $set: { 'notes.0.attachment': null } },
    )

    await expect(resolveOwnedFile(user._id, NOTE_PDF)).resolves.toBeNull()
  })

  it('does not confuse a prep-file URL with an attachment URL', async () => {
    // Both branches query the same collection on different paths; a note
    // attachment must not be found by the prep-file lookup or vice versa.
    const user = await seedUser('ada@example.com')
    await seedApplication(
      user._id,
      [{ name: 'Prep', type: 'pdf', url: PREP }],
      [noteWith(NOTE_PDF, 'Note file')],
    )

    await expect(resolveOwnedFile(user._id, PREP)).resolves.toEqual({ filename: 'Prep.pdf' })
    await expect(resolveOwnedFile(user._id, NOTE_PDF)).resolves.toEqual({
      filename: 'Note file.pdf',
    })
  })
})
