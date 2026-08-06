import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'

// GET — fetch all applications (with optional status filtering)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read optional status filter from query string (e.g., /api/applications?status=interview)
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')

    await connectDB()

    const query: Record<string, unknown> = { user: session.user.id }
    if (status) {
      query.status = status
    }

    const applications = await Application.find(query)
      .sort({ createdAt: -1 })
      .lean() // Converts to plain JS objects for higher speed & lower memory

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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const {
      company,
      role,
      status,
      jobUrl,
      jobDescription,
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

    if (!company?.trim() || !role?.trim()) {
      return NextResponse.json(
        { error: 'Company and role are required' },
        { status: 400 }
      )
    }

    await connectDB()

    const application = await Application.create({
      user: session.user.id,
      company: company.trim(),
      role: role.trim(),
      status: status || 'wishlist',
      jobUrl: jobUrl || '',
      jobDescription: jobDescription || '',
      location: location || '',
      workMode: workMode || '',
      jobType: jobType || '',
      salaryMin: typeof salaryMin === 'number' ? salaryMin : null,
      salaryMax: typeof salaryMax === 'number' ? salaryMax : null,
      salaryCurrency: salaryCurrency || 'USD',
      appliedDate: appliedDate ? new Date(appliedDate) : null,
      deadline: deadline ? new Date(deadline) : null,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      tags: Array.isArray(tags) ? tags : [],
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