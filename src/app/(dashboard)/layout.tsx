// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar, Header } from '@/components/layout'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">

      {/* Sidebar — fixed, never scrolls */}
      <Sidebar />

      {/* Right side — takes remaining width */}
      <div className="flex flex-col flex-1 min-w-0 ml-64 bg-background">

        {/* Header — sticky at top */}
        <div className="sticky top-0 z-30 shrink-0">
          <Header user={session.user} />
        </div>

        {/* Page content — scrollable */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 min-h-full bg-background">
            {children}
          </div>
        </main>

      </div>
    </div>
  )
}