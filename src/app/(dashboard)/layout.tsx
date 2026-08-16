// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar, Header } from '@/components/layout'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { VerifyEmailBanner } from '@/components/common/VerifyEmailBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    // h-screen, not min-h-screen: the shell is exactly the viewport so <main>
    // is the only scrolling element. With min-h-screen the shell could grow
    // past the viewport, the document itself scrolled, and the header went
    // with it.
    //
    // The header spans the full width and the sidebar sits beneath it as a
    // flex item, so the content takes the remaining space on its own — no
    // margin has to be kept in sync with the sidebar's width.
    <SidebarProvider>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <Header user={session.user} />

        {/* Outside <main> so it stays put while the page scrolls, and below the
            header so it never covers the nav. Renders nothing at all once the
            address is verified. */}
        <VerifyEmailBanner />

        <div className="flex flex-1 min-h-0">
          <Sidebar />

          {/* Page content — scrollable. Horizontal padding matches the
              header's inner container so the content's left edge lines up
              with the breadcrumb above it. */}
          <main className="flex-1 min-w-0 overflow-y-auto">
            <div className="px-6 py-6 min-h-full bg-background">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
