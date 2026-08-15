// src/app/(auth)/register/page.tsx
'use client'

import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { registerSchema, type RegisterFormValues } from '@/lib/schemas/auth'
import { apiSend, ApiError } from '@/lib/api-client'

const inputClass =
  'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'

export default function RegisterPage() {
  const router = useRouter()

  // The same schema the route validates with, so the 6-character minimum the
  // placeholder promises is now enforced before the network call rather than
  // only server-side.
  const form = useForm<RegisterFormValues>({
    resolver: standardSchemaResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  async function onSubmit(values: RegisterFormValues) {
    try {
      await apiSend('POST', '/api/auth/register', values)
      router.push('/login?registered=true')
    } catch (error) {
      // "Account with this Email already in use" belongs on the email field.
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong'
      form.setError(error instanceof ApiError && error.status === 409 ? 'email' : 'root', {
        message,
      })
    }
  }

  return (
    <Card className="w-full max-w-md bg-slate-900 border-slate-800">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-white">Create an account</CardTitle>
        <CardDescription className="text-slate-400">
          Start tracking your job applications
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Full Name</FormLabel>
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
                  <FormLabel className="text-slate-300">Email</FormLabel>
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
                  <FormLabel className="text-slate-300">Password</FormLabel>
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

            {form.formState.errors.root && (
              <p className="text-red-500 text-sm">
                {form.formState.errors.root.message}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Creating account...' : 'Create Account'}
            </Button>

            <p className="text-center text-slate-400 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
