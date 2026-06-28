// src/app/api/applications/[id]/status/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { status } = body

    console.log('PATCH status called — id:', id, 'status:', status)

    const validStatuses = ['wishlist', 'applied', 'interview', 'offer', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    await connectDB()

    const application = await Application.findOneAndUpdate(
      { _id: id, user: session.user.id },
      { $set: { status } },
      { new: true }
    )

    if (!application) {
      console.log('❌ Application not found — id:', id)
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    console.log('✅ Status updated to:', status)
    return NextResponse.json(application)

  } catch (error) {
    console.error('PATCH status error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}