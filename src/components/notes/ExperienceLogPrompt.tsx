// src/components/notes/ExperienceLogPrompt.tsx
'use client'

import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ExperienceLogPromptProps {
  company: string
  onSave: (log: {
    content: string
    whatWentWrong: string
    whatToImprove: string
  }) => Promise<void>
  onDismiss: () => void
}

export default function ExperienceLogPrompt({
  company,
  onSave,
  onDismiss,
}: ExperienceLogPromptProps) {
  const [content, setContent] = useState('')
  const [whatWentWrong, setWhatWentWrong] = useState('')
  const [whatToImprove, setWhatToImprove] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!content.trim()) return
    setLoading(true)
    try {
      await onSave({ content, whatWentWrong, whatToImprove })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="
      border border-orange-500/30 rounded-xl p-5
      bg-orange-500/5 space-y-4
    ">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-orange-500 shrink-0" />
          <div>
            <p className="text-foreground font-medium text-sm">
              Log your experience with {company}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Writing this down helps you improve for next time
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">
            What happened overall?
          </Label>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Describe the application process..."
            className="
              bg-background border-border text-foreground
              placeholder:text-muted-foreground/50
              min-h-[80px] resize-none
            "
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">
            What went wrong?
          </Label>
          <Textarea
            value={whatWentWrong}
            onChange={e => setWhatWentWrong(e.target.value)}
            placeholder="e.g. Was not prepared for system design questions..."
            className="
              bg-background border-border text-foreground
              placeholder:text-muted-foreground/50
              min-h-[70px] resize-none
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
            placeholder="e.g. Practice more system design, study distributed systems..."
            className="
              bg-background border-border text-foreground
              placeholder:text-muted-foreground/50
              min-h-[70px] resize-none
            "
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onDismiss}
          className="flex-1 border-border text-muted-foreground hover:bg-muted"
        >
          Skip
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading || !content.trim()}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
        >
          {loading ? 'Saving...' : 'Save Experience'}
        </Button>
      </div>
    </div>
  )
}