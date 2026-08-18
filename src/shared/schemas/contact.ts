// src/shared/schemas/contact.ts
import { z } from 'zod'
import { email, objectId, text } from './common'

// linkedIn stays a plain bounded string rather than a URL field: the route this
// replaces never protocol-checked it, and the value is rendered as text, not as
// an href. Tightening it to a URL would reject the bare "in/username" handles
// users have already saved.
const fields = {
  name: text('Name', { min: 1, max: 100 }),
  role: text('Role', { max: 100 }),
  email: email('Invalid email'),
  phone: text('Phone', { max: 30 }),
  linkedIn: text('LinkedIn', { max: 200 }),
}

export const contactCreateSchema = z.object({
  name: fields.name,
  role: fields.role.default(''),
  email: fields.email.default(''),
  phone: fields.phone.default(''),
  linkedIn: fields.linkedIn.default(''),
})

export const contactFormSchema = z.object(fields)

export const contactDeleteSchema = z.object({ contactId: objectId('contact id') })

export type ContactCreatePayload = z.input<typeof contactCreateSchema>
export type ContactCreateInput = z.infer<typeof contactCreateSchema>
export type ContactFormValues = z.input<typeof contactFormSchema>
export type ContactFormOutput = z.output<typeof contactFormSchema>
