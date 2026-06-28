// src/app/api/applications/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'

// GET — fetch all applications for logged in user
export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const applications = await Application.find({
      user: session.user.id
    }).sort({ createdAt: -1 })

    return NextResponse.json(applications)

  } catch (error) {
    console.error('GET /api/applications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}

// POST — create a new application
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const {
      company,
      role,
      status,
      jobUrl,
      location,
      workMode,
      jobType,
      salaryMin,
      salaryMax,
      salaryCurrency,
      appliedDate,
      deadline,
      followUpDate,
      tags,
    } = body

    if (!company || !role) {
      return NextResponse.json(
        { error: 'Company and role are required' },
        { status: 400 }
      )
    }

    await connectDB()

    const application = await Application.create({
      user: session.user.id,
      company,
      role,
      status: status ?? 'wishlist',
      jobUrl,
      location,
      workMode,
      jobType,
      salaryMin,
      salaryMax,
      salaryCurrency: salaryCurrency ?? 'USD',
      appliedDate,
      deadline,
      followUpDate,
      tags: tags ?? [],
    })

    return NextResponse.json(application, { status: 201 })

  } catch (error) {
    console.error('POST /api/applications error:', error)
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    )
  }
}