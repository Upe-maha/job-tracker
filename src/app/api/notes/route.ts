// src/app/api/notes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { guard } from '@/lib/api/guard'
import { parseQuery } from '@/lib/api/validate'
import { serverError } from '@/lib/api/respond'
import { fetchNotesFeed } from '@/lib/dal/notes'
import { notesQuerySchema } from '@/lib/schemas/note'

// GET — every note across the user's applications, paginated and filterable.
// Distinct from the dashboard's notesFeed, which is a fixed 10-item widget
// preview: this is the full set, which is what the /notes page needs.
export async function GET(req: NextRequest) {
  const g = await guard(req, { rateLimit: 'read' })
  if (!g.ok) return g.response

  // Replaces three hand-rolled Number()/isInteger blocks. parseQuery converts
  // absent params to undefined so the schema defaults fire, and the schema
  // bounds `page` — which feeds $skip and was previously unbounded.
  const query = parseQuery(req.nextUrl.searchParams, notesQuerySchema)
  if (!query.ok) return query.response

  try {
    await connectDB()

    const result = await fetchNotesFeed({
      userId: g.session.user.id,
      type: query.data.type ?? null,
      page: query.data.page,
      limit: query.data.limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    return serverError('notes.list.GET', error)
  }
}
