// src/app/api/applications/[id]/contacts/route.ts
import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Application from '@/models/Application'
import { guard } from '@/lib/api/guard'
import { readJsonBody, toObjectId } from '@/lib/api/validate'
import { fail, serverError } from '@/lib/api/respond'
import { isValidEmail } from '@/lib/security/sanitize'

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
  // Schema field is `linkedIn` — the original route destructured the
  // lowercase `linkedin`, which the client never sends, so every submitted
  // LinkedIn URL was silently dropped.
  const { name, role, email, phone, linkedIn } = body.data

  if (typeof name !== 'string' || !name.trim() || name.length > 100) {
    return fail(400, 'Name is required')
  }
  if (role !== undefined && (typeof role !== 'string' || role.length > 100)) {
    return fail(400, 'Invalid value for role')
  }
  if (email !== undefined && email !== '' && (typeof email !== 'string' || !isValidEmail(email))) {
    return fail(400, 'Invalid email')
  }
  if (phone !== undefined && (typeof phone !== 'string' || phone.length > 30)) {
    return fail(400, 'Invalid value for phone')
  }
  if (linkedIn !== undefined && (typeof linkedIn !== 'string' || linkedIn.length > 200)) {
    return fail(400, 'Invalid value for linkedIn')
  }

  try {
    await connectDB()

    const application = await Application.findOneAndUpdate(
      { _id: oid, user: g.session.user.id },
      {
        $push: {
          contacts: {
            name: name.trim(),
            role: role ?? '',
            email: email ?? '',
            phone: phone ?? '',
            linkedIn: linkedIn ?? '',
          }
        }
      },
      { new: true, runValidators: true }
    )

    if (!application) return fail(404, 'Application not found')

    const newContact = application.contacts[application.contacts.length - 1]
    return NextResponse.json({ message: 'Contact added successfully', contact: newContact }, { status: 201 })
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return fail(400, 'Invalid field value')
    }
    return serverError('contacts.POST', error)
  }
}

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

  const contactId = toObjectId(body.data.contactId)
  if (!contactId) return fail(400, 'Invalid contact id')

  try {
    await connectDB()

    const application = await Application.findOneAndUpdate(
      { _id: oid, user: g.session.user.id },
      { $pull: { contacts: { _id: contactId } } },
      { new: true }
    )

    if (!application) return fail(404, 'Application not found')
    return NextResponse.json({ message: 'Contact deleted successfully' })
  } catch (error) {
    return serverError('contacts.DELETE', error)
  }
}
