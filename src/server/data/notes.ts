// src/server/data/notes.ts
import mongoose from 'mongoose'
import Application from '@/models/Application'
import { NOTES_PAGE_SIZE } from '@/shared/schemas/note'
import type { INoteFeedItem, NoteType } from '@/types'

interface NotesFeedArgs {
  userId: string
  type?: NoteType | null
  page?: number
  limit?: number
}

interface NotesFeedResult {
  // createdAt is a Date here and serialises to an ISO string on the wire,
  // which is what INoteFeedItem describes.
  notes: INoteFeedItem[]
  nextPage: number | null
}

// Notes are embedded on Application, so "every note for a user" is an $unwind
// rather than a query against a notes collection. Projecting inside the
// pipeline is the whole point: the alternative — loading full applications and
// flattening in JS — drags every jobDescription, prepFile and contact across
// the wire just to render a list of note previews.
export async function fetchNotesFeed({
  userId,
  type = null,
  page = 0,
  limit = NOTES_PAGE_SIZE,
}: NotesFeedArgs): Promise<NotesFeedResult> {
  // aggregate() does NOT cast strings to ObjectId the way find() does. An
  // uncast $match here matches nothing and silently returns an empty feed.
  const user = new mongoose.Types.ObjectId(userId)

  const rows = await Application.aggregate([
    { $match: { user } },
    { $unwind: '$notes' },
    ...(type ? [{ $match: { 'notes.type': type } }] : []),
    // _id breaks ties so a page boundary can't repeat or drop a note when two
    // share a timestamp.
    { $sort: { 'notes.createdAt': -1, 'notes._id': -1 } },
    { $skip: page * limit },
    // Asking for one extra row is the cheapest way to learn whether another
    // page exists, without a second count query.
    { $limit: limit + 1 },
    {
      $project: {
        _id: 0,
        noteId: { $toString: '$notes._id' },
        applicationId: { $toString: '$_id' },
        company: 1,
        companyLogo: { $ifNull: ['$companyLogo', ''] },
        noteType: '$notes.type',
        content: '$notes.content',
        // Step F. $ifNull so a note written before attachments existed comes
        // back as an explicit null rather than an absent key — the feed rows
        // test `item.attachment &&`, and a missing key and a null read the same
        // there only by luck.
        attachment: { $ifNull: ['$notes.attachment', null] },
        createdAt: '$notes.createdAt',
      },
    },
  ])

  const hasMore = rows.length > limit
  return {
    notes: (hasMore ? rows.slice(0, limit) : rows) as INoteFeedItem[],
    nextPage: hasMore ? page + 1 : null,
  }
}
