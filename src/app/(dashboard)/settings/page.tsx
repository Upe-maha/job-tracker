// src/app/(dashboard)/settings/page.tsx
'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Lock, LogOut, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    if (passwords.new !== passwords.confirm) {
      setPwError('New passwords do not match')
      return
    }

    if (passwords.new.length < 6) {
      setPwError('Password must be at least 6 characters')
      return
    }

    setPwLoading(true)
    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPwError(data.error)
        return
      }

      setPwSuccess('Password updated successfully')
      setPasswords({ current: '', new: '', confirm: '' })

    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account settings
        </p>
      </div>

      {/* Change password */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-foreground font-semibold text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              Current Password
            </Label>
            <Input
              type="password"
              value={passwords.current}
              onChange={e =>
                setPasswords(p => ({ ...p, current: e.target.value }))
              }
              placeholder="Enter current password"
              className="bg-background border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              New Password
            </Label>
            <Input
              type="password"
              value={passwords.new}
              onChange={e =>
                setPasswords(p => ({ ...p, new: e.target.value }))
              }
              placeholder="Min 6 characters"
              className="bg-background border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              Confirm New Password
            </Label>
            <Input
              type="password"
              value={passwords.confirm}
              onChange={e =>
                setPasswords(p => ({ ...p, confirm: e.target.value }))
              }
              placeholder="Repeat new password"
              className="bg-background border-border text-foreground"
              required
            />
          </div>

          {pwError && (
            <p className="text-destructive text-sm">{pwError}</p>
          )}
          {pwSuccess && (
            <p className="text-green-500 text-sm">{pwSuccess}</p>
          )}

          <Button
            type="submit"
            disabled={pwLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {pwLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>

      {/* Sign out */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-foreground font-semibold text-sm flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          Session
        </h2>
        <p className="text-muted-foreground text-sm">
          Sign out of your account on this device.
        </p>
        <Button
          onClick={() => signOut({ callbackUrl: '/login' })}
          variant="outline"
          className="border-border text-muted-foreground hover:text-foreground gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-destructive/30 rounded-xl p-6 space-y-4">
        <h2 className="text-destructive font-semibold text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h2>
        <p className="text-muted-foreground text-sm">
          Once you delete your account, all your data will be permanently
          removed. This action cannot be undone.
        </p>
        <Button
          variant="outline"
          className="border-destructive/50 text-destructive hover:bg-destructive/10"
          disabled
        >
          Delete Account (coming soon)
        </Button>
      </div>

    </div>
  )
}