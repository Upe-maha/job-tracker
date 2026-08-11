// src/app/api/applications/[id]/notes/route.ts
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'
import { guard } from '@/lib/api/guard'
import { readJsonBody, toObjectId } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'

const NOTE_TYPES = ['interview_question', 'personal_experience', 'experience_log', 'general']
const INTERVIEW_ROUNDS = ['round_1', 'round_2', 'hr', 'technical', 'final', 'other']
const OUTCOMES = ['passed', 'failed', 'waiting']
const MAX_CONTENT_LENGTH = 20000
const MAX_FEEDBACK_LENGTH = 5000

// GET — fetch all notes for the application
export async function GET(
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
    const application = await Application.findOne({ _id: oid, user: g.session.user.id })
    if (!application) return fail(404, 'Application not found')
    return NextResponse.json(application.notes)
  } catch (error) {
    return serverError('notes.GET', error)
  }
}

// POST — add a new note to the application
export async function POST(
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
  const { type, content, interviewRound, outcome, whatWentWrong, whatToImprove } = body.data

  if (typeof content !== 'string' || !content.trim() || content.length > MAX_CONTENT_LENGTH) {
    return fail(400, 'Content is required')
  }
  if (type !== undefined && (typeof type !== 'string' || !NOTE_TYPES.includes(type))) {
    return fail(400, 'Invalid note type')
  }
  if (interviewRound != null && (typeof interviewRound !== 'string' || !INTERVIEW_ROUNDS.includes(interviewRound))) {
    return fail(400, 'Invalid interview round')
  }
  if (outcome != null && (typeof outcome !== 'string' || !OUTCOMES.includes(outcome))) {
    return fail(400, 'Invalid outcome')
  }
  if (whatWentWrong !== undefined && (typeof whatWentWrong !== 'string' || whatWentWrong.length > MAX_FEEDBACK_LENGTH)) {
    return fail(400, 'Invalid value for whatWentWrong')
  }
  if (whatToImprove !== undefined && (typeof whatToImprove !== 'string' || whatToImprove.length > MAX_FEEDBACK_LENGTH)) {
    return fail(400, 'Invalid value for whatToImprove')
  }

  try {
    await connectDB()

    const application = await Application.findOneAndUpdate(
      { _id: oid, user: g.session.user.id },
      {
        $push: {
          notes: {
            type: type ?? 'general',
            content: content.trim(),
            interviewRound: interviewRound ?? null,
            outcome: outcome ?? null,
            whatWentWrong: whatWentWrong ?? '',
            whatToImprove: whatToImprove ?? '',
          }
        }
      },
      { new: true, runValidators: true }
    )

    if (!application) return fail(404, 'Application not found')

    const newNote = application.notes[application.notes.length - 1]
    return NextResponse.json(newNote, { status: 201 })
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return fail(400, 'Invalid field value')
    }
    return serverError('notes.POST', error)
  }
}

// DELETE — delete a note from the application
export async function DELETE(
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

  const noteId = toObjectId(body.data.noteId)
  if (!noteId) return fail(400, 'Invalid note id')

  try {
    await connectDB()

    const application = await Application.findOneAndUpdate(
      { _id: oid, user: g.session.user.id },
      { $pull: { notes: { _id: noteId } } },
      { new: true }
    )

    if (!application) return fail(404, 'Application not found')
    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    return serverError('notes.DELETE', error)
  }
}
