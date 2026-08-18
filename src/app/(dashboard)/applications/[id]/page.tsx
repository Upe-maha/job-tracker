// src/app/(dashboard)/applications/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  DetailHeader,
  NotesTab,
  InterviewTab,
  ExperienceTab,
  ContactsTab,
  PrepFilesTab,
} from '@/components/applications/detail'
import { EditApplicationModal } from '@/components/applications'
import ExperienceLogPrompt from '@/components/notes/ExperienceLogPrompt'
import NoteModal from '@/components/notes/NoteModal'
import { useApplication } from '@/hooks/useQueries'
import {
  useAddContact,
  useAddNote,
  useAddPrepFile,
  useDeleteApplication,
  useDeleteContact,
  useDeleteNote,
  useDeletePrepFile,
  useUpdateNote,
} from '@/hooks/useMutations'
import type { NoteCreatePayload, NoteFormValues } from '@/shared/schemas/note'
import type { ContactCreatePayload } from '@/shared/schemas/contact'
import type { PrepFileCreateInput } from '@/shared/schemas/prep-file'
import { ApplicationStatus, INote } from '@/types'
import PageShell from '@/components/common/PageShell'
import ErrorState from '@/components/common/ErrorState'
import { DetailSkeleton } from '@/components/common/Skeletons'

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [showExpPrompt, setShowExpPrompt] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  // One edit modal for all three note tabs. This page already owns every note
  // handler and threads them down, so onEdit follows the same path; putting the
  // state in the tabs instead would triplicate it.
  const [editingNote, setEditingNote] = useState<INote | null>(null)

  const { data: application, isLoading, isError, error, refetch, isFetching } =
    useApplication(id)

  const deleteApplication = useDeleteApplication()
  const addNote = useAddNote(id)
  const updateNote = useUpdateNote(id)
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

  // Deliberately uncaught: a rejected mutation has to reach NoteModal's
  // onSubmit so the modal stays open with the user's text rather than closing
  // over a save that never happened.
  async function handleUpdateNote(noteId: string, note: NoteFormValues) {
    await updateNote.mutateAsync({ noteId, ...note })
  }

  async function handleDeleteNote(noteId: string) {
    await deleteNote.mutateAsync(noteId)
  }

  async function handleDeleteApplication() {
    await deleteApplication.mutateAsync(id)
    // The hook drops the detail query from the cache first, so this navigation
    // isn't racing a refetch that would 404 and flash ErrorState.
    router.push('/applications')
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

  // ── Loading / error / not found ────────────────────
  if (isLoading) {
    return (
      <PageShell>
        <DetailSkeleton />
      </PageShell>
    )
  }

  // A deleted or non-existent application answers 404, which ErrorState
  // renders as "We couldn't find that" rather than a retry loop.
  if (isError || !application) {
    return (
      <PageShell>
        <ErrorState error={error} onRetry={() => refetch()} isRetrying={isFetching} />
      </PageShell>
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
    <PageShell>

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
      <DetailHeader
        application={application}
        onEdit={() => setEditOpen(true)}
        onDelete={handleDeleteApplication}
      />

      {/* Mounted only while open, so each opening rebuilds the form from the
          current application — a status changed by a Kanban drag shows up. */}
      {editOpen && (
        <EditApplicationModal
          open
          application={application}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Likewise: a fresh mount per note is what gives RHF the right
          defaultValues without a reset effect. */}
      {editingNote && (
        <NoteModal
          open
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSubmit={values => handleUpdateNote(editingNote._id, values)}
        />
      )}

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
        {/* Five triggers do not fit a phone, and TabsList is `inline-flex
            w-fit` with no scroll container of its own — it simply overflowed.
            The same ScrollArea the Kanban board uses, rather than a second
            scrolling idiom for the same problem. */}
        <ScrollArea className="w-full">
          <TabsList className="bg-muted border border-border w-max">

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
              <span className="ml-1.5 text-xs bg-stage-applied-fg/20 text-stage-applied-fg px-1.5 py-0.5 rounded-full">
                {interviewCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="experience" className="data-[state=active]:bg-background">
            Experience Log
            {experienceCount > 0 && (
              <span className="ml-1.5 text-xs bg-stage-interview-fg/20 text-stage-interview-fg px-1.5 py-0.5 rounded-full">
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
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="notes">
          <NotesTab
            notes={application.notes}
            onAdd={handleAddNote}
            onEdit={setEditingNote}
            onDelete={handleDeleteNote}
          />
        </TabsContent>

        <TabsContent value="interview">
          <InterviewTab
            notes={application.notes}
            onAdd={handleAddNote}
            onEdit={setEditingNote}
            onDelete={handleDeleteNote}
          />
        </TabsContent>

        <TabsContent value="experience">
          <ExperienceTab
            notes={application.notes}
            onAdd={handleAddNote}
            onEdit={setEditingNote}
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
    </PageShell>
  )
}
