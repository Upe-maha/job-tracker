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
import { GitHubMark, GoogleMark } from "@/components/common/ProviderMarks";
import { Checkbox } from "@/components/ui/checkbox";


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
        defaultValues: { email: "", password: "", rememberMe: false },
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
                // Crosses the credentials transport as a string; authorize()
                // compares it as one. It only picks between two idle timeouts.
                rememberMe: values.rememberMe ? 'true' : 'false',
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
        <Card className="w-full max-w-md bg-card border-border">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-foreground">Welcome back</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Sign in to your job tracker
                </CardDescription>
            </CardHeader>
            <CardContent>

                {registered && (
                    <p className="text-stage-offer-fg text-sm bg-stage-offer px-3 py-2 rounded-md mb-4">
                        Account created successfully. Please sign in.
                    </p>
                )}

                {/* OAuth providers */}
                <div className="space-y-2">
                    <Button
                        type="button"
                        onClick={() => handleOAuth("google")}
                        disabled={form.formState.isSubmitting || oauthLoading !== ""}
                        className="w-full bg-white text-foreground hover:bg-muted"
                    >
                        <GoogleMark className="w-4 h-4 mr-2" />
                        {oauthLoading === "google" ? "Redirecting..." : "Continue with Google"}
                    </Button>

                    <Button
                        type="button"
                        onClick={() => handleOAuth("github")}
                        disabled={form.formState.isSubmitting || oauthLoading !== ""}
                        className="w-full bg-input text-foreground hover:bg-muted border border-input"
                    >
                        <GitHubMark className="w-4 h-4 mr-2" />
                        {oauthLoading === "github" ? "Redirecting..." : "Continue with GitHub"}
                    </Button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                    <span className="h-px flex-1 bg-input" />
                    <span className="text-muted-foreground text-xs">or</span>
                    <span className="h-px flex-1 bg-input" />
                </div>

                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

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
                                        className="bg-input border-input text-foreground placeholder:text-muted-foreground"
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
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-foreground">Password</FormLabel>
                                    <Link
                                        href="/forgot-password"
                                        className="text-ring hover:underline text-sm"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <FormControl>
                                    <Input
                                        type="password"
                                        placeholder="Your password"
                                        className="bg-input border-input text-foreground placeholder:text-muted-foreground"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="rememberMe"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={checked => field.onChange(checked === true)}
                                    />
                                </FormControl>
                                {/* The label is the control's own hit area, so
                                    the text is clickable rather than the 16px
                                    box being the only target. */}
                                <FormLabel className="text-muted-foreground text-sm font-normal cursor-pointer">
                                    Keep me signed in for a week
                                </FormLabel>
                            </FormItem>
                        )}
                    />

                    {(form.formState.errors.root || oauthError) && (
                        <p className="text-destructive text-sm">
                            {form.formState.errors.root?.message || oauthError}
                        </p>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <p className="text-center text-muted-foreground text-sm">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-ring hover:underline">
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
        <Card className="w-full max-w-md bg-card border-border">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-foreground">Welcome back</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Sign in to your account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-sm">Loading...</p>
            </CardContent>
        </Card>
    )
}
