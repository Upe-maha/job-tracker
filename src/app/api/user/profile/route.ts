// src/app/api/user/profile/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const user = await User.findById(session.user.id).select('-password')
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)

  } catch (error) {
    console.error('GET profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      bio,
      location,
      phone,
      linkedIn,
      portfolio,
      currency,
      jobSearchStatus,
    } = body

    await connectDB()

    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          name,
          bio,
          location,
          phone,
          linkedIn,
          portfolio,
          currency,
          jobSearchStatus,
        }
      },
      { new: true }
    ).select('-password')

    return NextResponse.json(user)

  } catch (error) {
    console.error('PUT profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}