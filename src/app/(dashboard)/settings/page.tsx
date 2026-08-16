// src/app/(dashboard)/settings/page.tsx
'use client'

import { signOut } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Lock, LogOut, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  passwordChangeFormSchema,
  type PasswordChangeFormValues,
} from '@/lib/schemas/user'
import { useChangePassword } from '@/hooks/useMutations'
import { ApiError } from '@/lib/api-client'
import PageShell from '@/components/common/PageShell'

const EMPTY: PasswordChangeFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export default function SettingsPage() {
  const changePassword = useChangePassword()

  // The schema owns all three rules the component used to hand-roll: the
  // 6-character minimum, the confirm-match, and "must differ from current" —
  // the last of which the client never checked, so it only ever surfaced as a
  // 400 after a round trip.
  const form = useForm<PasswordChangeFormValues>({
    resolver: standardSchemaResolver(passwordChangeFormSchema),
    defaultValues: EMPTY,
  })

  async function handleChangePassword(values: PasswordChangeFormValues) {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      form.reset(EMPTY)
    } catch (error) {
      // Server-side rejections ("Current password is incorrect") belong next
      // to the field, not in a toast.
      form.setError('currentPassword', {
        message: error instanceof ApiError ? error.message : 'Something went wrong',
      })
    }
  }

  return (
    <PageShell className="max-w-3xl">

      {/* Change password */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-foreground font-semibold text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Change Password
        </h2>

        {/* Step C made this confirm-first, so say so up front — otherwise the
            form looks like it failed when the password still works afterwards. */}
        <p className="text-muted-foreground text-xs">
          We&apos;ll email you a link to confirm. Your password stays the same until you click it.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleChangePassword)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs">Current Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter current password"
                      className="bg-background border-border text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs">New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Min 6 characters"
                      className="bg-background border-border text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs">Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Repeat new password"
                      className="bg-background border-border text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {form.formState.isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
          </form>
        </Form>
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

    </PageShell>
  )
}
