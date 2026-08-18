// src/app/api/dashboard/route.ts
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { connectDB } from '@/server/db'
import Application from '@/models/Application'
import { guard } from '@/server/http/guard'
import { serverError } from '@/server/http/respond'
import { fetchNotesFeed } from '@/server/data/notes'
import type { ApplicationStatus } from '@/types'

const NOTES_FEED_LIMIT = 10
const WIDGET_LIMIT = 5

// Only what the widgets actually render. Previously this route loaded whole
// applications — every jobDescription, note, prepFile and contact — to produce
// six counts and a handful of five-field rows.
const CARD_FIELDS = 'company role status companyLogo'

const EMPTY_STATS = {
  total: 0,
  wishlist: 0,
  applied: 0,
  interview: 0,
  offer: 0,
  rejected: 0,
}

export async function GET(req: Request) {
  const g = await guard(req, { rateLimit: 'read' })
  if (!g.ok) return g.response

  try {
    await connectDB()

    const userId = g.session.user.id
    // find() casts a string id for us; aggregate() does not.
    const user = new mongoose.Types.ObjectId(userId)

    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [statusCounts, deadlinesThisWeek, followUpsThisWeek, notesFeed, recentApplications] =
      await Promise.all([
        // ── Stats ──────────────────────────────────────
        // Counting in the database rather than filtering a hydrated array six
        // times. Served by the { user, status } index.
        Application.aggregate<{ _id: ApplicationStatus; count: number }>([
          { $match: { user } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        // ── Deadlines this week ────────────────────────
        // Sorted by deadline, so this is the five *soonest* — the old code took
        // the five most recently created that happened to fall in the window.
        Application.find({ user: userId, deadline: { $gte: now, $lte: weekFromNow } })
          .select(`${CARD_FIELDS} deadline`)
          .sort({ deadline: 1 })
          .limit(WIDGET_LIMIT)
          .lean(),

        // ── Follow-ups this week ───────────────────────
        Application.find({ user: userId, followUpDate: { $gte: now, $lte: weekFromNow } })
          .select(`${CARD_FIELDS} followUpDate`)
          .sort({ followUpDate: 1 })
          .limit(WIDGET_LIMIT)
          .lean(),

        // ── Notes feed ─────────────────────────────────
        // Same pipeline the /notes page paginates over, capped at a preview.
        fetchNotesFeed({ userId, limit: NOTES_FEED_LIMIT }),

        // ── Recent applications ────────────────────────
        Application.find({ user: userId })
          .select(`${CARD_FIELDS} createdAt`)
          .sort({ createdAt: -1 })
          .limit(WIDGET_LIMIT)
          .lean(),
      ])

    const stats = statusCounts.reduce(
      (acc, { _id, count }) => {
        if (_id in acc) acc[_id] = count
        acc.total += count
        return acc
      },
      { ...EMPTY_STATS } as Record<string, number>
    )

    return NextResponse.json({
      stats,
      deadlinesThisWeek,
      followUpsThisWeek,
      notesFeed: notesFeed.notes,
      recentApplications,
    })
  } catch (error) {
    return serverError('dashboard.GET', error)
  }
}
