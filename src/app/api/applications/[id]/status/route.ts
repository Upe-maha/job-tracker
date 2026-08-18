// src/app/api/applications/[id]/status/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/server/db'
import Application from '@/models/Application'
import { guard } from '@/server/http/guard'
import { parseBody, toObjectId } from '@/server/http/validate'
import { fail, serverError } from '@/server/http/respond'
import { applicationStatusSchema } from '@/shared/schemas/application'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req, { rateLimit: 'write' })
  if (!g.ok) return g.response

  const { id } = await params
  const oid = toObjectId(id)
  if (!oid) return fail(404, 'Application not found')

  const body = await parseBody(req, applicationStatusSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const application = await Application.findOneAndUpdate(
      { _id: oid, user: g.session.user.id },
      { $set: { status: body.data.status } },
      { new: true, runValidators: true }
    )

    if (!application) return fail(404, 'Application not found')

    return NextResponse.json(application)
  } catch (error) {
    return serverError('applications.status.PATCH', error)
  }
}
