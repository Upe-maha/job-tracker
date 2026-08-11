import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'
import { guard } from '@/lib/api/guard'
import { readJsonBody } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'

const STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected']
const WORK_MODES = ['remote', 'hybrid', 'on-site', '']
const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship', '']
const MAX_TAGS = 50

// GET — fetch all applications (with optional status filtering)
export async function GET(req: NextRequest) {
  const g = await guard(req)
  if (!g.ok) return g.response

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  if (status !== null && !STATUSES.includes(status)) {
    return fail(400, 'Invalid status filter')
  }

  try {
    await connectDB()

    const query: Record<string, unknown> = { user: g.session.user.id }
    if (status) query.status = status

    const applications = await Application.find(query)
      .sort({ createdAt: -1 })
      .lean() // Converts to plain JS objects for higher speed & lower memory

    return NextResponse.json(applications)
  } catch (error) {
    return serverError('applications.GET', error)
  }
}

// POST — create a new application
export async function POST(req: Request) {
  const g = await guard(req)
  if (!g.ok) return g.response

  const body = await readJsonBody(req)
  if (!body.ok) return body.response

  const {
    company, role, status, jobUrl, jobDescription, location,
    workMode, jobType, salaryMin, salaryMax, salaryCurrency,
    appliedDate, deadline, followUpDate, tags,
  } = body.data

  if (typeof company !== 'string' || !company.trim() || typeof role !== 'string' || !role.trim()) {
    return fail(400, 'Company and role are required')
  }
  if (status !== undefined && (typeof status !== 'string' || !STATUSES.includes(status))) {
    return fail(400, 'Invalid status')
  }
  if (workMode !== undefined && (typeof workMode !== 'string' || !WORK_MODES.includes(workMode))) {
    return fail(400, 'Invalid work mode')
  }
  if (jobType !== undefined && (typeof jobType !== 'string' || !JOB_TYPES.includes(jobType))) {
    return fail(400, 'Invalid job type')
  }
  if (tags !== undefined && (!Array.isArray(tags) || !tags.every(t => typeof t === 'string'))) {
    return fail(400, 'Invalid tags')
  }

  try {
    await connectDB()

    const application = await Application.create({
      user: g.session.user.id,
      company: company.trim(),
      role: role.trim(),
      status: status || 'wishlist',
      jobUrl: typeof jobUrl === 'string' ? jobUrl : '',
      jobDescription: typeof jobDescription === 'string' ? jobDescription : '',
      location: typeof location === 'string' ? location : '',
      workMode: workMode || '',
      jobType: jobType || '',
      salaryMin: typeof salaryMin === 'number' ? salaryMin : null,
      salaryMax: typeof salaryMax === 'number' ? salaryMax : null,
      salaryCurrency: typeof salaryCurrency === 'string' ? salaryCurrency : 'USD',
      appliedDate: appliedDate ? new Date(appliedDate as string) : null,
      deadline: deadline ? new Date(deadline as string) : null,
      followUpDate: followUpDate ? new Date(followUpDate as string) : null,
      tags: Array.isArray(tags) ? tags.filter(t => typeof t === 'string').slice(0, MAX_TAGS) : [],
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return fail(400, 'Invalid field value')
    }
    return serverError('applications.POST', error)
  }
}
