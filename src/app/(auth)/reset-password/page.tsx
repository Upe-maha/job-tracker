// src/app/(auth)/reset-password/page.tsx
'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { AuthCard, authInputClass } from '@/components/auth/AuthCard'
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
import { useResetPassword } from '@/hooks/useMutations'
import { ApiError } from '@/lib/api-client'
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/shared/schemas/auth'

function ResetPassword() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [done, setDone] = useState(false)
  const reset = useResetPassword()

  // The token rides in the form so the same schema validates it here and in the
  // route — a mangled link fails on its format before any network call.
  const form = useForm<ResetPasswordFormValues>({
    resolver: standardSchemaResolver(resetPasswordSchema),
    defaultValues: { token, password: '' },
  })

  async function onSubmit(values: ResetPasswordFormValues) {
    try {
      await reset.mutateAsync({ token: values.token, password: values.password })
      setDone(true)
    } catch (error) {
      form.setError('root', {
        message: error instanceof ApiError ? error.message : 'Something went wrong',
      })
    }
  }

  if (done) {
    return (
      <AuthCard title="Password updated">
        <p className="text-stage-offer-fg text-sm bg-stage-offer px-3 py-2 rounded-md">
          Your password has been changed. You can sign in with it now.
        </p>
        <p className="text-center text-muted-foreground text-sm mt-4">
          <Link href="/login" className="text-ring hover:underline">
            Go to sign in
          </Link>
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Choose a new password" description="Reset links expire one hour after they're sent.">
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">New password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Min 6 characters"
                    className={authInputClass}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* The token field is never shown, but its schema errors are: a link
              that arrived truncated should say so rather than fail silently. */}
          <FormMessage>{form.formState.errors.token?.message}</FormMessage>

          {form.formState.errors.root && (
            <p className="text-destructive text-sm">{form.formState.errors.root.message}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Updating...' : 'Update password'}
          </Button>

          <p className="text-center text-muted-foreground text-sm">
            <Link href="/forgot-password" className="text-ring hover:underline">
              Send a new link
            </Link>
          </p>
        </form>
      </Form>
    </AuthCard>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCard title="Choose a new password">Loading...</AuthCard>}>
      <ResetPassword />
    </Suspense>
  )
}
