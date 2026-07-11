// src/app/(dashboard)/applications/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DetailHeader,
  NotesTab,
  InterviewTab,
  ExperienceTab,
  ContactsTab,
} from '@/components/applications/detail'
import ExperienceLogPrompt from '@/components/notes/ExperienceLogPrompt'
import { IApplication, INote, ApplicationStatus } from '@/types'

async function fetchApplication(id: string): Promise<IApplication> {
  const res = await fetch(`/api/applications/${id}`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params.id as string

  const [showExpPrompt, setShowExpPrompt] = useState(false)
  const [prevStatus, setPrevStatus] = useState<ApplicationStatus | null>(null)

  const { data: application, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => fetchApplication(id),
  })

  // Show experience log prompt when moved to rejected
  useEffect(() => {
    if (!application) return
    if (prevStatus && prevStatus !== 'rejected' && application.status === 'rejected') {
      setShowExpPrompt(true)
    }
    setPrevStatus(application.status)
  }, [application?.status])

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['application', id] })
    queryClient.invalidateQueries({ queryKey: ['applications'] })
  }

  // ── Note handlers ──────────────────────────────────
  async function handleAddNote(note: Partial<INote>) {
    await fetch(`/api/applications/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    })
    invalidate()
  }

  async function handleDeleteNote(noteId: string) {
    await fetch(`/api/applications/${id}/notes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId }),
    })
    invalidate()
  }

  async function handleExperienceLog(log: {
    content: string
    whatWentWrong: string
    whatToImprove: string
  }) {
    await handleAddNote({
      type: 'experience_log',
      ...log,
    })
    setShowExpPrompt(false)
  }

  // ── Contact handlers ───────────────────────────────
  async function handleAddContact(contact: any) {
    await fetch(`/api/applications/${id}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    })
    invalidate()
  }

  async function handleDeleteContact(contactId: string) {
    await fetch(`/api/applications/${id}/contacts`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId }),
    })
    invalidate()
  }

  // ── Loading / not found ────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Application not found.</p>
      </div>
    )
  }

  // ── Tab badge counts ───────────────────────────────
  const interviewCount = application.notes.filter(
    n => n.type === 'interview_question' || n.type === 'personal_experience'
  ).length

  const experienceCount = application.notes.filter(
    n => n.type === 'experience_log'
  ).length

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="
          flex items-center gap-2 text-sm
          text-muted-foreground hover:text-foreground
          transition-colors
        "
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Applications
      </button>

      {/* Header */}
      <DetailHeader application={application} />

      {/* Experience log prompt */}
      {showExpPrompt && (
        <ExperienceLogPrompt
          company={application.company}
          onSave={handleExperienceLog}
          onDismiss={() => setShowExpPrompt(false)}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="notes" className="space-y-4">
        <TabsList className="bg-muted border border-border">

          <TabsTrigger value="notes" className="data-[state=active]:bg-background">
            Notes
            {application.notes.length > 0 && (
              <span className="ml-1.5 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {application.notes.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="interview" className="data-[state=active]:bg-background">
            Interview
            {interviewCount > 0 && (
              <span className="ml-1.5 text-xs bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded-full">
                {interviewCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="experience" className="data-[state=active]:bg-background">
            Experience Log
            {experienceCount > 0 && (
              <span className="ml-1.5 text-xs bg-orange-500/20 text-orange-500 px-1.5 py-0.5 rounded-full">
                {experienceCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="contacts" className="data-[state=active]:bg-background">
            Contacts
            {application.contacts.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-full">
                {application.contacts.length}
              </span>
            )}
          </TabsTrigger>

        </TabsList>

        <TabsContent value="notes">
          <NotesTab
            notes={application.notes}
            onAdd={handleAddNote}
            onDelete={handleDeleteNote}
          />
        </TabsContent>

        <TabsContent value="interview">
          <InterviewTab
            notes={application.notes}
            onAdd={handleAddNote}
            onDelete={handleDeleteNote}
          />
        </TabsContent>

        <TabsContent value="experience">
          <ExperienceTab
            notes={application.notes}
            onAdd={handleAddNote}
            onDelete={handleDeleteNote}
          />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsTab
            contacts={application.contacts}
            onAdd={handleAddContact}
            onDelete={handleDeleteContact}
          />
        </TabsContent>

      </Tabs>
    </div>
  )
}