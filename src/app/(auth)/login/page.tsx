"use client"

import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { loginSchema, type LoginFormValues } from '@/lib/schemas/auth'
import type { OAuthProvider } from '@/lib/schemas/enums'
import { loginErrorMessage, LOGIN_ERROR } from '@/lib/security/loginErrors'


function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const registered = searchParams.get("registered");

    // A provider sign-in reports failure by redirecting back here with ?error=.
    // Our own codes get a specific message; anything else NextAuth emits
    // (AccessDenied, OAuthAccountNotLinked, Configuration...) is collapsed into
    // the generic provider failure, since "Invalid email or password" — the
    // default for an unknown code — would be actively misleading here.
    const errorParam = searchParams.get("error");
    const oauthError = !errorParam
        ? ""
        : errorParam === LOGIN_ERROR.OAUTH_UNVERIFIED_EMAIL
            ? loginErrorMessage(errorParam)
            : loginErrorMessage(LOGIN_ERROR.OAUTH_FAILED);

    const [oauthLoading, setOauthLoading] = useState<OAuthProvider | "">("");

    // loginSchema deliberately only checks that a password was typed: applying
    // the strength policy here would leak it and lock out accounts created
    // under an older rule.
    const form = useForm<LoginFormValues>({
        resolver: standardSchemaResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    function handleOAuth(provider: OAuthProvider) {
        setOauthLoading(provider);
        form.clearErrors();
        // Full redirect to the provider — no redirect:false here, the whole
        // point is to leave the app and come back through the callback.
        signIn(provider, { callbackUrl: "/dashboard" });
    }

    async function onSubmit(values: LoginFormValues) {
        try {
            const result = await signIn('credentials', {
                email: values.email,
                password: values.password,
                redirect: false,
            })

            if (result?.error) {
                // The generic 'credentials' code covers a wrong password, an
                // unknown account and an OAuth-only account alike, so this
                // stays a form-level message rather than a field-level one.
                form.setError('root', { message: loginErrorMessage(result.code) });
                return;
            }

            router.push('/dashboard');
            router.refresh();
        } catch {
            form.setError('root', { message: 'Something went wrong. Please try again.' });
        }
    }
    return (
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
                <CardDescription className="text-slate-400">
                    Sign in to your job tracker
                </CardDescription>
            </CardHeader>
            <CardContent>

                {registered && (
                    <p className="text-green-400 text-sm bg-green-400/10 px-3 py-2 rounded-md mb-4">
                        Account created successfully. Please sign in.
                    </p>
                )}

                {/* OAuth providers */}
                <div className="space-y-2">
                    <Button
                        type="button"
                        onClick={() => handleOAuth("google")}
                        disabled={form.formState.isSubmitting || oauthLoading !== ""}
                        className="w-full bg-white text-slate-900 hover:bg-slate-200"
                    >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14z" />
                        </svg>
                        {oauthLoading === "google" ? "Redirecting..." : "Continue with Google"}
                    </Button>

                    <Button
                        type="button"
                        onClick={() => handleOAuth("github")}
                        disabled={form.formState.isSubmitting || oauthLoading !== ""}
                        className="w-full bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
                    >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                        {oauthLoading === "github" ? "Redirecting..." : "Continue with GitHub"}
                    </Button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                    <span className="h-px flex-1 bg-slate-800" />
                    <span className="text-slate-500 text-xs">or</span>
                    <span className="h-px flex-1 bg-slate-800" />
                </div>

                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

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
                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
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
                                        placeholder="Your password"
                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {(form.formState.errors.root || oauthError) && (
                        <p className="text-red-400 text-sm">
                            {form.formState.errors.root?.message || oauthError}
                        </p>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <p className="text-center text-slate-400 text-sm">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-blue-400 hover:underline">
                            Create one
                        </Link>
                    </p>

                </form>
                </Form>
            </CardContent>
        </Card>
    )

}

// useSearchParams opts the subtree into client-side rendering, which Next
// requires to sit behind a Suspense boundary or the page cannot be
// prerendered at build time.
export default function LoginPage() {
    return (
        <Suspense fallback={<LoginFallback />}>
            <LoginForm />
        </Suspense>
    )
}

function LoginFallback() {
    return (
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
                <CardDescription className="text-slate-400">
                    Sign in to your account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-slate-400 text-sm">Loading...</p>
            </CardContent>
        </Card>
    )
}
