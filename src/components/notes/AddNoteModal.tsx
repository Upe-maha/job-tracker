// src/components/notes/AddNoteModal.tsx
'use client'

import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  noteFormSchema,
  type NoteCreatePayload,
  type NoteFormValues,
} from '@/lib/schemas/note'
import {
  INTERVIEW_ROUND_LABELS,
  NOTE_OUTCOME_LABELS,
  NOTE_TYPE_META,
} from '@/lib/display'
import { INTERVIEW_ROUNDS, NOTE_OUTCOMES, NOTE_TYPES } from '@/lib/schemas/enums'
import type { NoteType } from '@/types'

interface AddNoteModalProps {
  open: boolean
  onClose: () => void
  onAdd: (note: NoteCreatePayload) => Promise<void>
  defaultType?: NoteType
}

const textareaClass =
  'bg-background border-border text-foreground placeholder:text-muted-foreground/50 resize-none'

// The one type whose picker label differs from the shared display label, because
// the modal explains when to use it.
const TYPE_OPTION_LABELS: Partial<Record<NoteType, string>> = {
  experience_log: 'Experience Log (Post Rejection)',
}

const CONTENT_LABELS: Record<NoteType, string> = {
  interview_question: 'Question Asked',
  personal_experience: 'Note',
  experience_log: 'What happened overall?',
  general: 'Note',
}

const CONTENT_PLACEHOLDERS: Record<NoteType, string> = {
  interview_question: 'e.g. Reverse a linked list and explain time complexity...',
  personal_experience: 'e.g. Interviewer was friendly, focused on leadership...',
  experience_log: 'Describe what happened in this application...',
  general: 'Write your note here...',
}

export default function AddNoteModal({
  open,
  onClose,
  onAdd,
  defaultType = 'general',
}: AddNoteModalProps) {
  const emptyValues: NoteFormValues = {
    type: defaultType,
    content: '',
    interviewRound: null,
    outcome: null,
    whatWentWrong: '',
    whatToImprove: '',
  }

  const form = useForm<NoteFormValues>({
    resolver: standardSchemaResolver(noteFormSchema),
    defaultValues: emptyValues,
  })

  const type = form.watch('type')
  const isInterview = type === 'interview_question' || type === 'personal_experience'
  const isExperienceLog = type === 'experience_log'

  // Clear the fields the new type doesn't show. Without this, choosing
  // 'interview_question' + a round, then switching to 'general', still posted
  // the stale round and outcome — the inputs were hidden, not reset.
  function handleTypeChange(next: NoteType) {
    form.setValue('type', next)
    const nextIsInterview =
      next === 'interview_question' || next === 'personal_experience'
    if (!nextIsInterview) {
      form.setValue('interviewRound', null)
      form.setValue('outcome', null)
    }
    if (next !== 'experience_log') {
      form.setValue('whatWentWrong', '')
      form.setValue('whatToImprove', '')
    }
  }

  async function onSubmit(values: NoteFormValues) {
    await onAdd(values)
    form.reset(emptyValues)
    onClose()
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) return
    form.reset(emptyValues)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Note</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">

            {/* Note type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs">Note Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={v => handleTypeChange(v as NoteType)}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-border">
                      {NOTE_TYPES.map(value => (
                        <SelectItem key={value} value={value}>
                          {TYPE_OPTION_LABELS[value] ?? NOTE_TYPE_META[value].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Interview round + outcome — only for interview types */}
            {isInterview && (
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="interviewRound"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">
                        Interview Round
                      </FormLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border">
                          {INTERVIEW_ROUNDS.map(value => (
                            <SelectItem key={value} value={value}>
                              {INTERVIEW_ROUND_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">Outcome</FormLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-border">
                          {NOTE_OUTCOMES.map(value => (
                            <SelectItem key={value} value={value}>
                              {NOTE_OUTCOME_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Main content — label and placeholder follow the type */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs">
                    {CONTENT_LABELS[type]}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={CONTENT_PLACEHOLDERS[type]}
                      className={`${textareaClass} min-h-[100px]`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Experience log extra fields */}
            {isExperienceLog && (
              <>
                <FormField
                  control={form.control}
                  name="whatWentWrong"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">
                        What went wrong?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g. Failed system design, wasn't prepared for distributed systems..."
                          className={`${textareaClass} min-h-[80px]`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatToImprove"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">
                        What will you improve?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g. Study system design, practice mock interviews..."
                          className={`${textareaClass} min-h-[80px]`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="flex-1 border-border text-muted-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {form.formState.isSubmitting ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
