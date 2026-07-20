// src/components/applications/detail/PrepFilesTab.tsx
'use client'

import { useState, useRef } from 'react'
import {
  Plus,
  FileText,
  Link,
  Trash2,
  ExternalLink,
  Loader2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { IPrepFile } from '@/types'

interface PrepFilesTabProps {
  files: IPrepFile[]
  applicationId: string
  onAdd: (file: { name: string; type: string; url: string }) => Promise<void>
  onDelete: (fileId: string) => Promise<void>
}

export default function PrepFilesTab({
  files,
  applicationId,
  onAdd,
  onDelete,
}: PrepFilesTabProps) {
  const [mode, setMode] = useState<'pdf' | 'link' | null>(null)
  const [linkForm, setLinkForm] = useState({ name: '', url: '' })
  const [uploading, setUploading] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── PDF Upload ──────────────────────────────────────
  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'prep-files')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      await onAdd({
        name: file.name.replace('.pdf', ''),
        type: 'pdf',
        url: data.url,
      })

      setMode(null)

    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Link Save ───────────────────────────────────────
  async function handleLinkSave(e: React.FormEvent) {
    e.preventDefault()
    if (!linkForm.name || !linkForm.url) return

    setError('')
    setLinkLoading(true)

    try {
      // Make sure URL has protocol
      const url = linkForm.url.startsWith('http')
        ? linkForm.url
        : `https://${linkForm.url}`

      await onAdd({
        name: linkForm.name,
        type: 'link',
        url,
      })

      setLinkForm({ name: '', url: '' })
      setMode(null)

    } catch (err) {
      setError('Failed to save link.')
    } finally {
      setLinkLoading(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          PDFs and links for interview preparation
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setMode('pdf')
              setError('')
              setTimeout(() => fileInputRef.current?.click(), 100)
            }}
            size="sm"
            variant="outline"
            disabled={uploading}
            className="border-border text-muted-foreground hover:text-foreground gap-2"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            Upload PDF
          </Button>
          <Button
            onClick={() => { setMode('link'); setError('') }}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Link className="w-3.5 h-3.5" />
            Add Link
          </Button>
        </div>
      </div>

      {/* Hidden PDF input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handlePdfUpload}
        className="hidden"
      />

      {/* Link form */}
      {mode === 'link' && (
        <form
          onSubmit={handleLinkSave}
          className="bg-card border border-border rounded-xl p-4 space-y-3"
        >
          <p className="text-foreground text-sm font-medium">Add a Link</p>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Label</Label>
            <Input
              value={linkForm.name}
              onChange={e =>
                setLinkForm(p => ({ ...p, name: e.target.value }))
              }
              placeholder="e.g. Company website, Job description..."
              className="bg-background border-border text-foreground h-9"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">URL</Label>
            <Input
              value={linkForm.url}
              onChange={e =>
                setLinkForm(p => ({ ...p, url: e.target.value }))
              }
              placeholder="https://..."
              className="bg-background border-border text-foreground h-9"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode(null)}
              className="flex-1 border-border text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={linkLoading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {linkLoading ? 'Saving...' : 'Save Link'}
            </Button>
          </div>
        </form>
      )}

      {/* Error */}
      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {/* Files list */}
      {files.length === 0 ? (
        <div className="
          border-2 border-dashed border-border rounded-xl
          flex flex-col items-center justify-center h-36 gap-2
        ">
          <p className="text-muted-foreground/50 text-sm">
            No prep files yet
          </p>
          <p className="text-muted-foreground/30 text-xs">
            Upload a PDF or add a link
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map(file => (
            <PrepFileRow
              key={file._id}
              file={file}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Single file row ───────────────────────────────────
function PrepFileRow({
  file,
  onDelete,
}: {
  file: IPrepFile
  onDelete: (id: string) => Promise<void>
}) {
  const isPdf = file.type === 'pdf'

  return (
    <div className="
      bg-card border border-border rounded-lg px-4 py-3
      flex items-center justify-between gap-3
    ">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center shrink-0
          ${isPdf
            ? 'bg-red-500/10 text-red-500'
            : 'bg-blue-500/10 text-blue-500'
          }
        `}>
          {isPdf ? (
            <FileText className="w-4 h-4" />
          ) : (
            <Link className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-foreground text-sm font-medium truncate">
            {file.name}
          </p>
          <p className="text-muted-foreground text-xs">
            {isPdf ? 'PDF Document' : 'Link'}{' '}
            {file.createdAt && (
              <>· {format(new Date(file.createdAt), 'MMM d')}</>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="
            text-muted-foreground hover:text-foreground
            transition-colors
          "
          title={isPdf ? 'Open PDF' : 'Open link'}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => onDelete(file._id)}
          className="
            text-muted-foreground hover:text-destructive
            transition-colors
          "
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}