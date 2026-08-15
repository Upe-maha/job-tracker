// src/app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'
import { guard } from '@/lib/api/guard'
import { parseBody, parseQuery } from '@/lib/api/validate'
import { serverError } from '@/lib/api/respond'
import {
  applicationCreateSchema,
  applicationListQuerySchema,
} from '@/lib/schemas/application'

// GET — fetch all applications (with optional status filtering)
export async function GET(req: NextRequest) {
  const g = await guard(req)
  if (!g.ok) return g.response

  const query = parseQuery(req.nextUrl.searchParams, applicationListQuerySchema)
  if (!query.ok) return query.response

  try {
    await connectDB()

    const filter: Record<string, unknown> = { user: g.session.user.id }
    if (query.data.status) filter.status = query.data.status

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .lean() // Converts to plain JS objects for higher speed & lower memory

    return NextResponse.json(applications)
  } catch (error) {
    return serverError('applications.list.GET', error)
  }
}

// POST — create a new application
export async function POST(req: Request) {
  const g = await guard(req)
  if (!g.ok) return g.response

  // The schema supplies every default and rejects a bad enum, URL, date,
  // number or tag array before this point. companyLogo is deliberately absent
  // from the create schema — PUT is its only writer.
  const body = await parseBody(req, applicationCreateSchema)
  if (!body.ok) return body.response

  try {
    await connectDB()

    const application = await Application.create({
      ...body.data,
      user: g.session.user.id,
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    // No ValidationError branch: Zod ran first, so a Mongoose validation error
    // here means the two schemas have drifted. That is a server bug and should
    // be logged as a 500, not reported to the caller as bad input.
    return serverError('applications.list.POST', error)
  }
}
