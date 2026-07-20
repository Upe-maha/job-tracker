// src/app/api/applications/[id]/prep-files/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'

export async function POST(
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
    const { name, type, url } = body

    if (!name || !type || !url) {
      return NextResponse.json(
        { error: 'Name, type and url are required' },
        { status: 400 }
      )
    }

    await connectDB()

    const application = await Application.findOneAndUpdate(
      { _id: id, user: session.user.id },
      { $push: { prepFiles: { name, type, url } } },
      { new: true }
    )

    if (!application) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(
      application.prepFiles[application.prepFiles.length - 1],
      { status: 201 }
    )

  } catch (error) {
    console.error('POST prep-file error:', error)
    return NextResponse.json(
      { error: 'Failed to add file' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { fileId } = await req.json()
    await connectDB()

    await Application.findOneAndUpdate(
      { _id: id, user: session.user.id },
      { $pull: { prepFiles: { _id: fileId } } }
    )

    return NextResponse.json({ message: 'File deleted' })

  } catch (error) {
    console.error('DELETE prep-file error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}