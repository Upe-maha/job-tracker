// src/app/api/applications/[id]/contacts/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/server/db'
import { guard } from '@/server/http/guard'
import { parseBody, toObjectId } from '@/server/http/validate'
import { fail, serverError } from '@/server/http/respond'
import { pullSubdocument, pushSubdocument } from '@/server/data/applications'
import { contactCreateSchema, contactDeleteSchema } from '@/shared/schemas/contact'
import type { IContact } from '@/types'

// POST — add a contact to the application
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  const body = await parseBody(req, contactCreateSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const result = await pushSubdocument<IContact>({
      userId: g.session.user.id,
      appId: oid,
      field: 'contacts',
      value: body.data,
    })

    if (!result.ok) {
      return result.reason === 'limit'
        ? fail(409, 'This application has too many contacts')
        : fail(404, 'Application not found')
    }

    // Bare subdocument, matching the notes and prep-files routes — this one
    // used to wrap it in a { message, contact } envelope.
    return NextResponse.json(result.created, { status: 201 })
  } catch (error) {
    return serverError('contacts.POST', error)
  }
}

// DELETE — remove a contact from the application
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  const body = await parseBody(req, contactDeleteSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const removed = await pullSubdocument({
      userId: g.session.user.id,
      appId: oid,
      field: 'contacts',
      subId: body.data.contactId,
    })

    if (!removed) return fail(404, 'Application not found')
    return NextResponse.json({ message: 'Contact deleted' })
  } catch (error) {
    return serverError('contacts.DELETE', error)
  }
}
