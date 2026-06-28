"use client"

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'


export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const registered = searchParams.get("registered");

    const [form, setForm] = useState({
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn('credentials', {
                email: form.email,
                password: form.password,
                redirect: false,
            })

            if (result?.error) {
                setError("Invalid email or password");
                return;
            }

            // Login successful — go to dashboard

            router.push('/dashboard');
            router.refresh();
        } catch (err) {
            setError('Something went wrong. Please try again.')
        } finally {
            setIsLoading(false)
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
                <form onSubmit={handleSubmit} className="space-y-4">

                    {registered && (
                        <p className="text-green-400 text-sm bg-green-400/10 px-3 py-2 rounded-md">
                            Account created successfully. Please sign in.
                        </p>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-300">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-300">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Your password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm">{error}</p>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <p className="text-center text-slate-400 text-sm">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-blue-400 hover:underline">
                            Create one
                        </Link>
                    </p>

                </form>
            </CardContent>
        </Card>
    )

}