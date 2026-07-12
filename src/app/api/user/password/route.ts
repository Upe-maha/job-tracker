// src/app/api/user/password/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import bcrypt from 'bcryptjs'

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Both fields are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400 }
      )
    }

    await connectDB()
    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await User.findByIdAndUpdate(session.user.id, { password: hashed })

    return NextResponse.json({ message: 'Password updated' })

  } catch (error) {
    console.error('PUT password error:', error)
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    )
  }
}