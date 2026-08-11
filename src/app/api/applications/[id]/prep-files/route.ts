// src/app/api/applications/[id]/prep-files/route.ts
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'
import { guard } from '@/lib/api/guard'
import { readJsonBody, toObjectId } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'

function isValidFileUrl(url: string, type: 'pdf' | 'link'): boolean {
  try {
    const parsed = new URL(url)
    // PDFs only ever come from our own /api/upload -> Cloudinary.
    if (type === 'pdf') return parsed.protocol === 'https:' && parsed.hostname === 'res.cloudinary.com'
    // Links are user-typed and the client accepts a bare http:// URL as-is.
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req)
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  const body = await readJsonBody(req)
  if (!body.ok) return body.response
  const { name, type, url } = body.data

  if (typeof name !== 'string' || !name.trim() || name.length > 200) {
    return fail(400, 'Name, type and url are required')
  }
  if (type !== 'pdf' && type !== 'link') {
    return fail(400, 'Name, type and url are required')
  }
  if (typeof url !== 'string' || !isValidFileUrl(url, type)) {
    return fail(400, 'Name, type and url are required')
  }

  try {
    await connectDB()

    const application = await Application.findOneAndUpdate(
      { _id: oid, user: g.session.user.id },
      { $push: { prepFiles: { name: name.trim(), type, url } } },
      { new: true, runValidators: true }
    )

    if (!application) return fail(404, 'Not found')

    return NextResponse.json(
      application.prepFiles[application.prepFiles.length - 1],
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return fail(400, 'Invalid field value')
    }
    return serverError('prep-files.POST', error)
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req)
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  const body = await readJsonBody(req)
  if (!body.ok) return body.response

  const fileId = toObjectId(body.data.fileId)
  if (!fileId) return fail(400, 'Invalid file id')

  try {
    await connectDB()

    // Previously ignored, so DELETE always reported success even when the
    // application id/owner didn't match.
    const application = await Application.findOneAndUpdate(
      { _id: oid, user: g.session.user.id },
      { $pull: { prepFiles: { _id: fileId } } },
      { new: true }
    )

    if (!application) return fail(404, 'Not found')
    return NextResponse.json({ message: 'File deleted' })
  } catch (error) {
    return serverError('prep-files.DELETE', error)
  }
}
