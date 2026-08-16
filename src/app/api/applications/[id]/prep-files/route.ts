// src/app/api/applications/[id]/prep-files/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { guard } from '@/lib/api/guard'
import { parseBody, toObjectId } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'
import { pullSubdocument, pushSubdocument } from '@/lib/dal/applications'
import { prepFileCreateSchema, prepFileDeleteSchema } from '@/lib/schemas/prepFile'
import type { IPrepFile } from '@/types'

// POST — add a prep file (uploaded PDF or plain link) to the application
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  // The schema owns the type/url interdependency: a 'pdf' must be a Cloudinary
  // URL from our own /api/upload, a 'link' any safe http(s) URL. Replaces the
  // route-local isValidFileUrl, which reimplemented isSafeUrl without its
  // 2048-character cap.
  const body = await parseBody(req, prepFileCreateSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const result = await pushSubdocument<IPrepFile>({
      userId: g.session.user.id,
      appId: oid,
      field: 'prepFiles',
      value: body.data,
    })

    if (!result.ok) {
      return result.reason === 'limit'
        ? fail(409, 'This application has too many prep files')
        : fail(404, 'Application not found')
    }

    return NextResponse.json(result.created, { status: 201 })
  } catch (error) {
    return serverError('prepFiles.POST', error)
  }
}

// DELETE — remove a prep file from the application
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  const body = await parseBody(req, prepFileDeleteSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const removed = await pullSubdocument({
      userId: g.session.user.id,
      appId: oid,
      field: 'prepFiles',
      subId: body.data.fileId,
    })

    if (!removed) return fail(404, 'Application not found')
    return NextResponse.json({ message: 'File deleted' })
  } catch (error) {
    return serverError('prepFiles.DELETE', error)
  }
}
