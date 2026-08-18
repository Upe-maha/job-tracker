// src/server/data/applications.integration.test.ts
//
// Runs against a real mongod for the same reason tokens.integration.test.ts
// does: ownership scoping and the positional-$ binding are properties of a
// MongoDB *query*, and a mocked model can only assert the shape of the filter
// object — which passes just as happily when the semantics are wrong. A mock
// would not notice that `notes.$.content` silently updated nothing, or that
// dropping `user` from the filter let one account edit another's notes.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Application from '@/models/Application'
import { updateSubdocument } from './applications'
import type { INote } from '@/types'

let mongod: MongoMemoryServer

const owner = new mongoose.Types.ObjectId()
const stranger = new mongoose.Types.ObjectId()

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}, 60_000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

// Two notes on every application, so "left the sibling alone" is testable.
async function seed(user: mongoose.Types.ObjectId) {
  return Application.create({
    user,
    company: 'Acme',
    role: 'Engineer',
    notes: [
      { type: 'interview_question', content: 'first', interviewRound: 'round_1' },
      { type: 'general', content: 'second' },
    ],
  })
}

beforeEach(async () => {
  await Application.deleteMany({})
})

describe('updateSubdocument — the happy path', () => {
  it('updates the targeted note and returns it', async () => {
    const app = await seed(owner)
    const target = app.notes[0]

    const updated = await updateSubdocument<INote>({
      userId: owner.toString(),
      appId: app._id.toString(),
      field: 'notes',
      subId: target._id.toString(),
      value: { content: 'edited' },
    })

    expect(updated?.content).toBe('edited')

    const reloaded = await Application.findById(app._id)
    expect(reloaded!.notes[0].content).toBe('edited')
  })

  it('leaves the sibling note untouched', async () => {
    const app = await seed(owner)

    await updateSubdocument<INote>({
      userId: owner.toString(),
      appId: app._id.toString(),
      field: 'notes',
      subId: app.notes[0]._id.toString(),
      value: { content: 'edited' },
    })

    const reloaded = await Application.findById(app._id)
    expect(reloaded!.notes[1].content).toBe('second')
    expect(reloaded!.notes[1].type).toBe('general')
  })

  // The positional $ only writes the keys it is given, which is what lets the
  // edit form omit fields without clearing them.
  it('does not disturb fields the update never mentions', async () => {
    const app = await seed(owner)

    await updateSubdocument<INote>({
      userId: owner.toString(),
      appId: app._id.toString(),
      field: 'notes',
      subId: app.notes[0]._id.toString(),
      value: { content: 'edited' },
    })

    const reloaded = await Application.findById(app._id)
    expect(reloaded!.notes[0].interviewRound).toBe('round_1')
  })

  // Clearing is a value the caller sends, not an absent key — this is how
  // switching a note's type drops its stale round and outcome.
  it('writes an explicit null when one is sent', async () => {
    const app = await seed(owner)

    await updateSubdocument<INote>({
      userId: owner.toString(),
      appId: app._id.toString(),
      field: 'notes',
      subId: app.notes[0]._id.toString(),
      value: { type: 'general', interviewRound: null },
    })

    const reloaded = await Application.findById(app._id)
    expect(reloaded!.notes[0].interviewRound).toBeNull()
  })
})

describe('updateSubdocument — ownership is the security boundary', () => {
  it("returns null for another user's application", async () => {
    const app = await seed(owner)

    const updated = await updateSubdocument<INote>({
      userId: stranger.toString(),
      appId: app._id.toString(),
      field: 'notes',
      subId: app.notes[0]._id.toString(),
      value: { content: 'hijacked' },
    })

    expect(updated).toBeNull()
  })

  it("leaves that application's data unmodified", async () => {
    const app = await seed(owner)

    await updateSubdocument<INote>({
      userId: stranger.toString(),
      appId: app._id.toString(),
      field: 'notes',
      subId: app.notes[0]._id.toString(),
      value: { content: 'hijacked' },
    })

    const reloaded = await Application.findById(app._id)
    expect(reloaded!.notes[0].content).toBe('first')
  })
})

describe('updateSubdocument — no match', () => {
  // Unlike pullSubdocument, which is idempotent, an unknown id is a null here.
  // The route turns that into the same 404 as "not your application".
  it('returns null for a noteId that is not on the application', async () => {
    const app = await seed(owner)

    const updated = await updateSubdocument<INote>({
      userId: owner.toString(),
      appId: app._id.toString(),
      field: 'notes',
      subId: new mongoose.Types.ObjectId().toString(),
      value: { content: 'edited' },
    })

    expect(updated).toBeNull()
  })

  it('returns null for an application that does not exist', async () => {
    const updated = await updateSubdocument<INote>({
      userId: owner.toString(),
      appId: new mongoose.Types.ObjectId().toString(),
      field: 'notes',
      subId: new mongoose.Types.ObjectId().toString(),
      value: { content: 'edited' },
    })

    expect(updated).toBeNull()
  })
})

describe('updateSubdocument — timestamps', () => {
  // NoteSchema has { timestamps: true }, but Mongoose only maintains
  // subdocument timestamps through save(). Without the explicit
  // `notes.$.updatedAt` in the $set, an edited note keeps its original value
  // forever and INote.updatedAt is a lie.
  it('bumps the subdocument updatedAt', async () => {
    const app = await seed(owner)
    const before = app.notes[0].updatedAt

    await new Promise(resolve => setTimeout(resolve, 10))

    await updateSubdocument<INote>({
      userId: owner.toString(),
      appId: app._id.toString(),
      field: 'notes',
      subId: app.notes[0]._id.toString(),
      value: { content: 'edited' },
    })

    const reloaded = await Application.findById(app._id)
    expect(reloaded!.notes[0].updatedAt.getTime()).toBeGreaterThan(before.getTime())
  })

  // The parent's timestamps come from Mongoose itself on findOneAndUpdate.
  it('bumps the parent application updatedAt', async () => {
    const app = await seed(owner)
    const before = app.updatedAt

    await new Promise(resolve => setTimeout(resolve, 10))

    await updateSubdocument<INote>({
      userId: owner.toString(),
      appId: app._id.toString(),
      field: 'notes',
      subId: app.notes[0]._id.toString(),
      value: { content: 'edited' },
    })

    const reloaded = await Application.findById(app._id)
    expect(reloaded!.updatedAt.getTime()).toBeGreaterThan(before.getTime())
  })
})
