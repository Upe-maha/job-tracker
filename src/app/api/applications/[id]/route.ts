// src/app/api/applications/[id]/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'
import { guard } from '@/lib/api/guard'
import { parseBody, toObjectId } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'
import { applicationUpdateSchema } from '@/lib/schemas/application'

// GET — fetch single application
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'read' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  // Invalid id and "not found" return the identical response, so a malformed
  // id and someone else's real id are indistinguishable.
  if (!oid) return fail(404, 'Application not found')

  try {
    await connectDB()
    const application = await Application.findOne({ _id: oid, user: g.session.user.id })
    if (!application) return fail(404, 'Application not found')
    return NextResponse.json(application)
  } catch (error) {
    return serverError('applications.detail.GET', error)
  }
}

// PUT — update application
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  // The schema replaces APPLICATION_UPDATABLE + coerceUpdate wholesale: it
  // strips unknown keys (so user/_id/timestamps and the subdocument arrays
  // stay unwritable), keeps absent fields absent rather than defaulting them,
  // protocol-checks companyLogo and jobUrl, and — unlike coerceUpdate —
  // *rejects* an unparseable date or a non-numeric salary instead of silently
  // writing null, and a non-array `tags` instead of silently wiping them.
  const body = await parseBody(req, applicationUpdateSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()
    const application = await Application.findOneAndUpdate(
      { _id: oid, user: g.session.user.id },
      { $set: body.data },
      { new: true, runValidators: true }
    )
    if (!application) return fail(404, 'Application not found')
    return NextResponse.json(application)
  } catch (error) {
    return serverError('applications.detail.PUT', error)
  }
}

// DELETE — delete application
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  try {
    await connectDB()
    const application = await Application.findOneAndDelete({ _id: oid, user: g.session.user.id })
    if (!application) return fail(404, 'Application not found')
    return NextResponse.json({ message: 'Application deleted' })
  } catch (error) {
    return serverError('applications.detail.DELETE', error)
  }
}
