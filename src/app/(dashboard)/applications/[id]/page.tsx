// src/app/(dashboard)/applications/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DetailHeader,
  NotesTab,
  InterviewTab,
  ExperienceTab,
  ContactsTab,
  PrepFilesTab,
} from '@/components/applications/detail'
import ExperienceLogPrompt from '@/components/notes/ExperienceLogPrompt'
import { useApplication } from '@/hooks/useQueries'
import {
  useAddContact,
  useAddNote,
  useAddPrepFile,
  useDeleteContact,
  useDeleteNote,
  useDeletePrepFile,
} from '@/hooks/useMutations'
import type { NoteCreatePayload } from '@/lib/schemas/note'
import type { ContactCreatePayload } from '@/lib/schemas/contact'
import type { PrepFileCreateInput } from '@/lib/schemas/prepFile'
import { ApplicationStatus } from '@/types'

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [showExpPrompt, setShowExpPrompt] = useState(false)

  const { data: application, isLoading } = useApplication(id)

  const addNote = useAddNote(id)
  const deleteNote = useDeleteNote(id)
  const addContact = useAddContact(id)
  const deleteContact = useDeleteContact(id)
  const addPrepFile = useAddPrepFile(id)
  const deletePrepFile = useDeletePrepFile(id)

  // Offer the experience-log prompt the moment an application becomes
  // rejected. Tracked by comparing against the previous render's value rather
  // than in an effect: setting state inside an effect body triggers a
  // cascading re-render, which is what the lint rule here objects to.
  const status = application?.status ?? null
  const [prevStatus, setPrevStatus] = useState<ApplicationStatus | null>(status)
  if (status !== prevStatus) {
    setPrevStatus(status)
    if (prevStatus && prevStatus !== 'rejected' && status === 'rejected') {
      setShowExpPrompt(true)
    }
  }

  // ── Handlers ───────────────────────────────────────
  // Each mutation owns its own invalidation and error reporting, so these are
  // just adapters between the child components' props and the hooks.
  async function handleAddNote(note: NoteCreatePayload) {
    await addNote.mutateAsync(note)
  }

  async function handleDeleteNote(noteId: string) {
    await deleteNote.mutateAsync(noteId)
  }

  async function handleExperienceLog(log: {
    content: string
    whatWentWrong: string
    whatToImprove: string
  }) {
    await addNote.mutateAsync({ type: 'experience_log', ...log })
    setShowExpPrompt(false)
  }

  async function handleAddContact(contact: ContactCreatePayload) {
    await addContact.mutateAsync(contact)
  }

  async function handleDeleteContact(contactId: string) {
    await deleteContact.mutateAsync(contactId)
  }

  async function handleAddPrepFile(file: PrepFileCreateInput) {
    await addPrepFile.mutateAsync(file)
  }

  async function handleDeletePrepFile(fileId: string) {
    await deletePrepFile.mutateAsync(fileId)
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

          <TabsTrigger value="prep" className="data-[state=active]:bg-background">
            Prep Files
            {application.prepFiles.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-full">
                {application.prepFiles.length}
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

        <TabsContent value="prep">
          <PrepFilesTab
            files={application.prepFiles}
            onAdd={handleAddPrepFile}
            onDelete={handleDeletePrepFile}
          />
        </TabsContent>

      </Tabs>
    </div>
  )
}