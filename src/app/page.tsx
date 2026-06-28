// src/app/page.tsx
import { redirect } from 'next/navigation'
import { getToken } from 'next-auth/jwt'
import { headers, cookies } from 'next/headers'

export default async function RootPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('next-auth.session-token') ||
                cookieStore.get('__Secure-next-auth.session-token')

  if (token) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}