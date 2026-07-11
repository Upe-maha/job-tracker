// src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'

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

    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // ── Stats ────────────────────────────────────────
    const stats = {
      total:     applications.length,
      wishlist:  applications.filter(a => a.status === 'wishlist').length,
      applied:   applications.filter(a => a.status === 'applied').length,
      interview: applications.filter(a => a.status === 'interview').length,
      offer:     applications.filter(a => a.status === 'offer').length,
      rejected:  applications.filter(a => a.status === 'rejected').length,
    }

    // ── Deadlines this week ───────────────────────────
    const deadlinesThisWeek = applications
      .filter(a =>
        a.deadline &&
        new Date(a.deadline) >= now &&
        new Date(a.deadline) <= weekFromNow
      )
      .map(a => ({
        _id: a._id,
        company: a.company,
        role: a.role,
        status: a.status,
        deadline: a.deadline,
        companyLogo: a.companyLogo,
      }))
      .slice(0, 5)

    // ── Follow-ups this week ──────────────────────────
    const followUpsThisWeek = applications
      .filter(a =>
        a.followUpDate &&
        new Date(a.followUpDate) >= now &&
        new Date(a.followUpDate) <= weekFromNow
      )
      .map(a => ({
        _id: a._id,
        company: a.company,
        role: a.role,
        status: a.status,
        followUpDate: a.followUpDate,
        companyLogo: a.companyLogo,
      }))
      .slice(0, 5)

    // ── Notes feed ────────────────────────────────────
    // Flatten all notes from all applications
    const notesFeed = applications
      .flatMap(a =>
        (a.notes ?? []).map((note: any) => ({
          noteId: note._id.toString(),
          applicationId: a._id.toString(),
          company: a.company,
          companyLogo: a.companyLogo ?? '',
          noteType: note.type,
          content: note.content,
          createdAt: note.createdAt,
        }))
      )
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 10)

    // ── Recent applications ───────────────────────────
    const recentApplications = applications
      .slice(0, 5)
      .map(a => ({
        _id: a._id,
        company: a.company,
        role: a.role,
        status: a.status,
        companyLogo: a.companyLogo,
        createdAt: a.createdAt,
      }))

    return NextResponse.json({
      stats,
      deadlinesThisWeek,
      followUpsThisWeek,
      notesFeed,
      recentApplications,
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}