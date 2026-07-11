// src/components/applications/detail/ContactsTab.tsx
'use client'

import { useState } from 'react'
import { Plus, User, Mail, Phone, Trash2, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IContact } from '@/types'

interface ContactsTabProps {
  contacts: IContact[]
  onAdd: (contact: Omit<IContact, '_id'>) => Promise<void>
  onDelete: (contactId: string) => Promise<void>
}

const emptyForm = {
  name: '',
  role: '',
  email: '',
  phone: '',
  linkedIn: '',
}

export default function ContactsTab({
  contacts,
  onAdd,
  onDelete,
}: ContactsTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onAdd(form)
      setForm(emptyForm)
      setShowForm(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Recruiters and contacts at this company
        </p>
        <Button
          onClick={() => setShowForm(v => !v)}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Contact
        </Button>
      </div>

      {/* Add contact form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-4 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Name *</Label>
              <Input
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="John Doe"
                className="bg-background border-border text-foreground h-9"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Role</Label>
              <Input
                value={form.role}
                onChange={e => update('role', e.target.value)}
                placeholder="HR Manager"
                className="bg-background border-border text-foreground h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Email</Label>
              <Input
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="john@company.com"
                className="bg-background border-border text-foreground h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Phone</Label>
              <Input
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="+977 98XXXXXXXX"
                className="bg-background border-border text-foreground h-9"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-muted-foreground text-xs">LinkedIn</Label>
              <Input
                value={form.linkedIn}
                onChange={e => update('linkedIn', e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="bg-background border-border text-foreground h-9"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="flex-1 border-border text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Adding...' : 'Add Contact'}
            </Button>
          </div>
        </form>
      )}

      {/* Contacts list */}
      {contacts.length === 0 && !showForm ? (
        <div className="
          border-2 border-dashed border-border rounded-xl
          flex items-center justify-center h-32
        ">
          <p className="text-muted-foreground/50 text-sm">
            No contacts yet. Add recruiters or interviewers.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map(contact => (
            <ContactCard
              key={contact._id}
              contact={contact}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Single contact card ───────────────────────────────
function ContactCard({
  contact,
  onDelete,
}: {
  contact: IContact
  onDelete: (id: string) => Promise<void>
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="
            w-9 h-9 rounded-full bg-muted
            flex items-center justify-center shrink-0
          ">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-foreground font-medium text-sm">
              {contact.name}
            </p>
            {contact.role && (
              <p className="text-muted-foreground text-xs">
                {contact.role}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => onDelete(contact._id)}
          className="
            text-muted-foreground hover:text-destructive
            transition-colors
          "
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Contact details */}
      <div className="mt-3 space-y-1.5 pl-12">
        {contact.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-3 h-3" />
            <a
              href={`mailto:${contact.email}`}
              className="text-xs hover:text-foreground transition-colors"
            >
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span className="text-xs">{contact.phone}</span>
          </div>
        )}
        {contact.linkedIn && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link className="w-3 h-3" />
            <a
              href={contact.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:text-foreground transition-colors"
            >
              LinkedIn Profile
            </a>
          </div>
        )}
      </div>
    </div>
  )
}