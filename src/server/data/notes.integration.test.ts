// src/server/data/notes.integration.test.ts
//
// fetchNotesFeed is an aggregation, and its two known failure modes are both
// properties of the pipeline rather than of any JS around it: $match does not
// cast a string to an ObjectId the way find() does (an uncast user silently
// returns an empty feed), and a projected field that is absent rather than null
// reads differently at the call site. A mocked model cannot fail either way.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Application from '@/models/Application'
import { fetchNotesFeed } from './notes'

let mongod: MongoMemoryServer

const ATTACHMENT = {
  url: 'https://res.cloudinary.com/demo/raw/upload/v1/job-tracker/note-files/take-home-ffeeddcc',
  name: 'Take home',
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}, 60_000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

afterEach(async () => {
  await Application.deleteMany({})
})

const userId = new mongoose.Types.ObjectId()

function seed(notes: unknown[], user: mongoose.Types.ObjectId = userId) {
  return Application.create({ user, company: 'Acme', role: 'Engineer', notes })
}

describe('fetchNotesFeed — attachments (Step F)', () => {
  it('projects an attachment through to the feed row', async () => {
    await seed([{ type: 'general', content: 'With file', attachment: ATTACHMENT }])

    const { notes } = await fetchNotesFeed({ userId: userId.toString() })

    expect(notes).toHaveLength(1)
    expect(notes[0].attachment).toMatchObject(ATTACHMENT)
  })

  it('returns null, not an absent key, for a note without one', async () => {
    // $ifNull is what makes this true. A note written before Step F has no
    // attachment path at all, and `'attachment' in row` would be false — the
    // feed rows test `item.attachment &&`, which survives either, but the type
    // says `INoteAttachment | null` and the data should match it.
    await seed([{ type: 'general', content: 'No file' }])

    const { notes } = await fetchNotesFeed({ userId: userId.toString() })

    expect(notes[0]).toHaveProperty('attachment')
    expect(notes[0].attachment).toBeNull()
  })

  it('keeps each note with its own attachment across applications', async () => {
    const second = { url: `${ATTACHMENT.url}-2`, name: 'Second' }
    await seed([{ type: 'general', content: 'A', attachment: ATTACHMENT }])
    await seed([{ type: 'general', content: 'B', attachment: second }])

    const { notes } = await fetchNotesFeed({ userId: userId.toString() })

    const byContent = Object.fromEntries(notes.map(n => [n.content, n.attachment?.name]))
    expect(byContent).toEqual({ A: 'Take home', B: 'Second' })
  })

  it('does not leak another user’s notes', async () => {
    await seed([{ type: 'general', content: 'Mine', attachment: ATTACHMENT }])
    await seed([{ type: 'general', content: 'Theirs' }], new mongoose.Types.ObjectId())

    const { notes } = await fetchNotesFeed({ userId: userId.toString() })

    expect(notes.map(n => n.content)).toEqual(['Mine'])
  })
})
