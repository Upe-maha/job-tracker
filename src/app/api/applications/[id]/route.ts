// src/app/api/applications/[id]/route.ts
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'
import { guard } from '@/lib/api/guard'
import { readJsonBody, pickAllowed, toObjectId } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'

// Deliberately excludes user, _id, createdAt/updatedAt, and the subdocument
// arrays (notes/prepFiles/contacts) — those have dedicated routes, and letting
// PUT replace them wholesale would both lose data and bypass their schemas.
const APPLICATION_UPDATABLE = [
  'company', 'role', 'companyLogo', 'status', 'jobUrl', 'jobDescription',
  'location', 'workMode', 'jobType', 'salaryMin', 'salaryMax', 'salaryCurrency',
  'appliedDate', 'deadline', 'followUpDate', 'tags',
] as const

const DATE_FIELDS = new Set(['appliedDate', 'deadline', 'followUpDate'])
const NUMBER_FIELDS = new Set(['salaryMin', 'salaryMax'])

function coerceUpdate(picked: Partial<Record<string, unknown>>) {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(picked)) {
    if (DATE_FIELDS.has(key)) {
      out[key] = value ? new Date(value as string) : null
    } else if (NUMBER_FIELDS.has(key)) {
      out[key] = typeof value === 'number' ? value : null
    } else if (key === 'tags') {
      out[key] = Array.isArray(value) ? value.filter(t => typeof t === 'string').slice(0, 50) : []
    } else {
      out[key] = value
    }
  }
  return out
}

// GET — fetch single application
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req)
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
    return serverError('applications.GET', error)
  }
}

// PUT — update application
export async function PUT(
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

  const picked = pickAllowed(body.data, APPLICATION_UPDATABLE)
  if (Object.keys(picked).length === 0) return fail(400, 'No valid fields to update')

  const update = coerceUpdate(picked)

  try {
    await connectDB()
    const application = await Application.findOneAndUpdate(
      { _id: oid, user: g.session.user.id },
      { $set: update },
      { new: true, runValidators: true }
    )
    if (!application) return fail(404, 'Application not found')
    return NextResponse.json(application)
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return fail(400, 'Invalid field value')
    }
    return serverError('applications.PUT', error)
  }
}

// DELETE — delete application
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard(req)
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
    return serverError('applications.DELETE', error)
  }
}
