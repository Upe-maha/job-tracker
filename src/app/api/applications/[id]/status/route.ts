// src/app/api/applications/[id]/status/route.ts
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'
import { guard } from '@/lib/api/guard'
import { readJsonBody, toObjectId } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'

const VALID_STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected']

export async function PATCH(
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
  const { status } = body.data

  if (typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
    return fail(400, 'Invalid status')
  }

  try {
    await connectDB()

    const application = await Application.findOneAndUpdate(
      { _id: oid, user: g.session.user.id },
      { $set: { status } },
      { new: true, runValidators: true }
    )

    if (!application) return fail(404, 'Application not found')

    return NextResponse.json(application)
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return fail(400, 'Invalid field value')
    }
    return serverError('applications.status.PATCH', error)
  }
}
