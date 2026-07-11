// src/components/notes/AddNoteModal.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NoteType } from '@/types'

interface AddNoteModalProps {
  open: boolean
  onClose: () => void
  onAdd: (note: any) => Promise<void>
  defaultType?: NoteType
}

export default function AddNoteModal({
  open,
  onClose,
  onAdd,
  defaultType = 'general',
}: AddNoteModalProps) {
  const [type, setType] = useState<NoteType>(defaultType)
  const [content, setContent] = useState('')
  const [interviewRound, setInterviewRound] = useState('')
  const [outcome, setOutcome] = useState('')
  const [whatWentWrong, setWhatWentWrong] = useState('')
  const [whatToImprove, setWhatToImprove] = useState('')
  const [loading, setLoading] = useState(false)

  function reset() {
    setType(defaultType)
    setContent('')
    setInterviewRound('')
    setOutcome('')
    setWhatWentWrong('')
    setWhatToImprove('')
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)

    try {
      await onAdd({
        type,
        content,
        interviewRound: interviewRound || null,
        outcome: outcome || null,
        whatWentWrong,
        whatToImprove,
      })
      reset()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const isInterview =
    type === 'interview_question' || type === 'personal_experience'
  const isExperienceLog = type === 'experience_log'

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="bg-card border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Note</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Note type */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Note Type</Label>
            <Select
              value={type}
              onValueChange={v => setType(v as NoteType)}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="interview_question">
                  Interview Question
                </SelectItem>
                <SelectItem value="personal_experience">
                  Personal Experience
                </SelectItem>
                <SelectItem value="experience_log">
                  Experience Log (Post Rejection)
                </SelectItem>
                <SelectItem value="general">General Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interview round + outcome — only for interview types */}
          {isInterview && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Interview Round
                </Label>
                <Select
                  value={interviewRound}
                  onValueChange={setInterviewRound}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="round_1">Round 1</SelectItem>
                    <SelectItem value="round_2">Round 2</SelectItem>
                    <SelectItem value="hr">HR Round</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="final">Final Round</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Outcome
                </Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              {type === 'interview_question'
                ? 'Question Asked'
                : type === 'experience_log'
                ? 'What happened overall?'
                : 'Note'}
            </Label>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={
                type === 'interview_question'
                  ? 'e.g. Reverse a linked list and explain time complexity...'
                  : type === 'personal_experience'
                  ? 'e.g. Interviewer was friendly, focused on leadership...'
                  : type === 'experience_log'
                  ? 'Describe what happened in this application...'
                  : 'Write your note here...'
              }
              className="
                bg-background border-border text-foreground
                placeholder:text-muted-foreground/50
                min-h-[100px] resize-none
              "
              required
            />
          </div>

          {/* Experience log extra fields */}
          {isExperienceLog && (
            <>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  What went wrong?
                </Label>
                <Textarea
                  value={whatWentWrong}
                  onChange={e => setWhatWentWrong(e.target.value)}
                  placeholder="e.g. Failed system design, wasn't prepared for distributed systems..."
                  className="
                    bg-background border-border text-foreground
                    placeholder:text-muted-foreground/50
                    min-h-[80px] resize-none
                  "
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  What will you improve?
                </Label>
                <Textarea
                  value={whatToImprove}
                  onChange={e => setWhatToImprove(e.target.value)}
                  placeholder="e.g. Study system design, practice mock interviews..."
                  className="
                    bg-background border-border text-foreground
                    placeholder:text-muted-foreground/50
                    min-h-[80px] resize-none
                  "
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !content.trim()}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Saving...' : 'Save Note'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}