// src/app/(auth)/register/page.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { registerFormSchema, type RegisterFormValues } from '@/shared/schemas/auth'
import type { OAuthProvider } from '@/shared/schemas/enums'
import { apiSend, ApiError } from '@/client/api-client'
import { GitHubMark, GoogleMark } from '@/components/common/ProviderMarks'

const inputClass =
  'bg-input border-input text-foreground placeholder:text-muted-foreground'

export default function RegisterPage() {
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | ''>('')

  // The same schema the route validates with, so the 6-character minimum the
  // placeholder promises is now enforced before the network call rather than
  // only server-side.
  const form = useForm<RegisterFormValues>({
    resolver: standardSchemaResolver(registerFormSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  function handleOAuth(provider: OAuthProvider) {
    setOauthLoading(provider)
    form.clearErrors()
    // Full redirect to the provider, same as the login page — no redirect:false,
    // the whole point is to leave the app and come back through the callback.
    signIn(provider, { callbackUrl: '/dashboard' })
  }

  async function onSubmit(values: RegisterFormValues) {
    try {
      const { confirmPassword: _confirmPassword, ...payload } = values
      await apiSend('POST', '/api/auth/register', payload)
      // Step C: the route answers identically whether or not the address was
      // already taken, so there is no longer a 409 to put on the email field
      // and nothing here may hint at which happened. Staying on this page with
      // a "check your inbox" panel is the only honest outcome — redirecting to
      // /login?registered=true would assert an account was created.
      setSubmittedEmail(values.email)
    } catch (error) {
      form.setError('root', {
        message: error instanceof ApiError ? error.message : 'Something went wrong',
      })
    }
  }

  if (submittedEmail) {
    return (
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-foreground">Check your inbox</CardTitle>
          <CardDescription className="text-muted-foreground">
            We sent a message to {submittedEmail}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Follow the link in that email to finish setting up your account. It expires in 24
            hours.
          </p>
          <p className="text-center text-muted-foreground text-sm">
            <Link href="/login" className="text-ring hover:underline">
              Go to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md bg-card border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-foreground">Create an account</CardTitle>
        <CardDescription className="text-muted-foreground">
          Start tracking your job applications
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* OAuth providers */}
        <div className="space-y-2">
          <Button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={form.formState.isSubmitting || oauthLoading !== ''}
            className="w-full bg-white text-foreground hover:bg-muted"
          >
            <GoogleMark className="w-4 h-4 mr-2" />
            {oauthLoading === 'google' ? 'Redirecting...' : 'Continue with Google'}
          </Button>

          <Button
            type="button"
            onClick={() => handleOAuth('github')}
            disabled={form.formState.isSubmitting || oauthLoading !== ''}
            className="w-full bg-input text-foreground hover:bg-muted border border-input"
          >
            <GitHubMark className="w-4 h-4 mr-2" />
            {oauthLoading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <span className="h-px flex-1 bg-input" />
          <span className="text-muted-foreground text-xs">or</span>
          <span className="h-px flex-1 bg-input" />
        </div>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Upendra Sharma" className={inputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Min 6 characters"
                      className={inputClass}
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
                  <FormLabel className="text-foreground">Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Repeat your password"
                      className={inputClass}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-destructive text-sm">
                {form.formState.errors.root.message}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Creating account...' : 'Create Account'}
            </Button>

            <p className="text-center text-muted-foreground text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-ring hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
