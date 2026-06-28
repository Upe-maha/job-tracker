// src/components/dashboard/AddApplicationModal.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AddApplicationModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const defaultForm = {
  company: '',
  role: '',
  jobUrl: '',
  status: 'wishlist',
  workMode: '',
  jobType: '',
  location: '',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'USD',
  appliedDate: '',
  deadline: '',
}

export default function AddApplicationModal({
  open,
  onClose,
  onSuccess,
}: AddApplicationModalProps) {
  const router = useRouter()
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function updateForm(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
          appliedDate: form.appliedDate || null,
          deadline: form.deadline || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }

      // Reset form
      setForm(defaultForm)
      onSuccess()
      onClose()
      router.refresh()

    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose()
    }}>
      <DialogContent
        className="bg-card border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          e.preventDefault()
        }}
        onInteractOutside={(e) => {
          e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Job Application</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Company + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Company *</Label>
              <Input
                placeholder="Google"
                value={form.company}
                onChange={e => updateForm('company', e.target.value)}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground h-9"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Role *</Label>
              <Input
                placeholder="Frontend Developer"
                value={form.role}
                onChange={e => updateForm('role', e.target.value)}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground h-9"
                required
              />
            </div>
          </div>

          {/* Job URL */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Job URL</Label>
            <Input
              placeholder="https://careers.google.com/..."
              value={form.jobUrl}
              onChange={e => updateForm('jobUrl', e.target.value)}
              className="bg-input border-input text-foreground placeholder:text-muted-foreground h-9"
            />
          </div>

          {/* Status + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={v => updateForm('status', v)}
              >
                <SelectTrigger className="bg-input border-input text-foreground h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="wishlist">Wishlist</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Location</Label>
              <Input
                placeholder="Kathmandu / Remote"
                value={form.location}
                onChange={e => updateForm('location', e.target.value)}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground h-9"
              />
            </div>
          </div>

          {/* Work Mode + Job Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Work Mode</Label>
              <Select
                value={form.workMode}
                onValueChange={v => updateForm('workMode', v)}
              >
                <SelectTrigger className="bg-input border-input text-foreground h-9">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="on-site">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Job Type</Label>
              <Select
                value={form.jobType}
                onValueChange={v => updateForm('jobType', v)}
              >
                <SelectTrigger className="bg-input border-input text-foreground h-9">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Salary */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Salary Range (optional)</Label>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Min"
                type="number"
                value={form.salaryMin}
                onChange={e => updateForm('salaryMin', e.target.value)}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground h-9"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                placeholder="Max"
                type="number"
                value={form.salaryMax}
                onChange={e => updateForm('salaryMax', e.target.value)}
                className="bg-input border-input text-foreground placeholder:text-muted-foreground h-9"
              />
              <Select
                value={form.salaryCurrency}
                onValueChange={v => updateForm('salaryCurrency', v)}
              >
                <SelectTrigger className="bg-input border-input text-foreground h-9 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="NPR">NPR</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Applied Date</Label>
              <Input
                type="date"
                value={form.appliedDate}
                onChange={e => updateForm('appliedDate', e.target.value)}
                className="bg-input border-input text-foreground h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Deadline</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={e => updateForm('deadline', e.target.value)}
                className="bg-input border-input text-foreground h-9"
              />
            </div>
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
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
              disabled={loading}
              className="flex-1 bg-brand hover:bg-brand-hover text-primary-foreground"
            >
              {loading ? 'Adding...' : 'Add Job'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}