'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/dist/client/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function RegisterPage() {
    const router = useRouter()
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: ''
    })

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(form)
            })
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong')
                return
            }

            router.push('/login?registered=true')
        } catch (error) {
            setError('Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-white">
                    Create an account
                </CardTitle>
                <CardDescription className="text-slate-400">
                    Start tracking your job applications
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>

                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-slate-300">Full Name</Label>
                        <Input
                            id="name"
                            placeholder="Upendra Sharma"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                            required
                        />
                    </div>

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
                            placeholder="Min 6 characters"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm">{error}</p>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                    
                    <p className="text-center text-slate-400 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-blue-400 hover:underline">
                            Sign in
                        </Link>
                    </p>
                </form>
            </CardContent>

        </Card>
    )
}