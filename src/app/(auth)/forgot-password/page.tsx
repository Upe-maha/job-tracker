// src/app/(auth)/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { useForgotPassword } from '@/hooks/useMutations'
import { ApiError } from '@/client/api-client'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/shared/schemas/auth'

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState('')
  const forgot = useForgotPassword()

  const form = useForm<ForgotPasswordFormValues>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await forgot.mutateAsync(values.email)
      // The route answers the same thing whether or not the account exists, so
      // this screen must not imply otherwise.
      setSentTo(values.email)
    } catch (error) {
      form.setError('root', {
        message: error instanceof ApiError ? error.message : 'Something went wrong',
      })
    }
  }

  if (sentTo) {
    return (
      <AuthCard title="Check your inbox">
        <p className="text-stage-offer-fg text-sm bg-stage-offer px-3 py-2 rounded-md">
          If {sentTo} has an account, a reset link is on its way. It expires in 1 hour.
        </p>
        <p className="text-center text-muted-foreground text-sm mt-4">
          <Link href="/login" className="text-ring hover:underline">
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="We'll email you a link to choose a new one."
    >
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className={authInputClass}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root && (
            <p className="text-destructive text-sm">{form.formState.errors.root.message}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>

          <p className="text-center text-muted-foreground text-sm">
            Remembered it?{' '}
            <Link href="/login" className="text-ring hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </Form>
    </AuthCard>
  )
}
