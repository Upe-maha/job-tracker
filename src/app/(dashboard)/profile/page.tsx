// src/app/(dashboard)/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  User,
  MapPin,
  Phone,
  Link,
  Globe,
  Briefcase,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

async function fetchProfile() {
  const res = await fetch('/api/user/profile')
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  })

  const [form, setForm] = useState({
    name: '',
    bio: '',
    location: '',
    phone: '',
    linkedIn: '',
    portfolio: '',
    currency: 'USD',
    jobSearchStatus: 'actively_looking',
  })

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? '',
        bio: profile.bio ?? '',
        location: profile.location ?? '',
        phone: profile.phone ?? '',
        linkedIn: profile.linkedIn ?? '',
        portfolio: profile.portfolio ?? '',
        currency: profile.currency ?? 'USD',
        jobSearchStatus: profile.jobSearchStatus ?? 'actively_looking',
      })
    }
  }, [profile])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your personal information and preferences
        </p>
      </div>

      {/* Avatar section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="
            w-16 h-16 rounded-full bg-primary
            flex items-center justify-center
            text-primary-foreground font-bold text-2xl
            shrink-0
          ">
            {form.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="text-foreground font-semibold text-lg">
              {form.name || 'Your Name'}
            </p>
            <p className="text-muted-foreground text-sm">
              {profile?.email}
            </p>
            <span className={`
              text-xs px-2 py-0.5 rounded-full border mt-1 inline-block
              ${form.jobSearchStatus === 'actively_looking'
                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                : form.jobSearchStatus === 'open'
                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                : 'bg-muted text-muted-foreground border-border'
              }
            `}>
              {form.jobSearchStatus === 'actively_looking'
                ? 'Actively Looking'
                : form.jobSearchStatus === 'open'
                ? 'Open to Offers'
                : 'Not Looking'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="space-y-6">

        {/* Personal info */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-foreground font-semibold text-sm flex items-center gap-2">
            <User className="w-4 h-4" />
            Personal Information
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-muted-foreground text-xs">Full Name</Label>
              <Input
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="Your full name"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label className="text-muted-foreground text-xs">Bio</Label>
              <Textarea
                value={form.bio}
                onChange={e => update('bio', e.target.value)}
                placeholder="Brief description about yourself..."
                className="
                  bg-background border-border text-foreground
                  min-h-[80px] resize-none
                "
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location
              </Label>
              <Input
                value={form.location}
                onChange={e => update('location', e.target.value)}
                placeholder="Kathmandu, Nepal"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </Label>
              <Input
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="+977 98XXXXXXXX"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <Link className="w-3 h-3" /> LinkedIn
              </Label>
              <Input
                value={form.linkedIn}
                onChange={e => update('linkedIn', e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <Globe className="w-3 h-3" /> Portfolio
              </Label>
              <Input
                value={form.portfolio}
                onChange={e => update('portfolio', e.target.value)}
                placeholder="https://yourportfolio.com"
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-foreground font-semibold text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Job Search Preferences
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                Job Search Status
              </Label>
              <Select
                value={form.jobSearchStatus}
                onValueChange={v => update('jobSearchStatus', v)}
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="actively_looking">
                    Actively Looking
                  </SelectItem>
                  <SelectItem value="open">Open to Offers</SelectItem>
                  <SelectItem value="not_looking">Not Looking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                Preferred Currency
              </Label>
              <Select
                value={form.currency}
                onValueChange={v => update('currency', v)}
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                  <SelectItem value="NPR">NPR — Nepali Rupee</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                  <SelectItem value="GBP">GBP — British Pound</SelectItem>
                  <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Save button */}
        <Button
          type="submit"
          disabled={saving}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
        </Button>

      </form>
    </div>
  )
}