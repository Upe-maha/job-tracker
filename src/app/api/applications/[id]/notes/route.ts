// src/app/api/applications/[id]/notes/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { guard } from '@/lib/api/guard'
import { parseBody, toObjectId } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'
import {
  findOwnedApplication,
  pullSubdocument,
  pushSubdocument,
  updateSubdocument,
} from '@/lib/dal/applications'
import {
  noteCreateSchema,
  noteDeleteSchema,
  noteUpdateSchema,
} from '@/shared/schemas/note'
import type { INote } from '@/types'

// GET — fetch all notes for the application
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'read' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  try {
    await connectDB()
    const application = await findOwnedApplication(g.session.user.id, oid)
    if (!application) return fail(404, 'Application not found')
    return NextResponse.json(application.notes)
  } catch (error) {
    return serverError('notes.GET', error)
  }
}

// POST — add a new note to the application
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  const body = await parseBody(req, noteCreateSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const result = await pushSubdocument<INote>({
      userId: g.session.user.id,
      appId: oid,
      field: 'notes',
      value: body.data,
    })

    if (!result.ok) {
      return result.reason === 'limit'
        ? fail(409, 'This application has too many notes')
        : fail(404, 'Application not found')
    }

    return NextResponse.json(result.created, { status: 201 })
  } catch (error) {
    return serverError('notes.POST', error)
  }
}

// PUT — edit a note in place. noteId travels in the body rather than the URL,
// matching DELETE below — see md/step-d-crud.md.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  const body = await parseBody(req, noteUpdateSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const { noteId, ...updates } = body.data

    const updated = await updateSubdocument<INote>({
      userId: g.session.user.id,
      appId: oid,
      field: 'notes',
      subId: noteId,
      value: updates,
    })

    if (!updated) return fail(404, 'Application not found')
    return NextResponse.json(updated)
  } catch (error) {
    return serverError('notes.PUT', error)
  }
}

// DELETE — delete a note from the application
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  const body = await parseBody(req, noteDeleteSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const removed = await pullSubdocument({
      userId: g.session.user.id,
      appId: oid,
      field: 'notes',
      subId: body.data.noteId,
    })

    if (!removed) return fail(404, 'Application not found')
    return NextResponse.json({ message: 'Note deleted' })
  } catch (error) {
    return serverError('notes.DELETE', error)
  }
}
