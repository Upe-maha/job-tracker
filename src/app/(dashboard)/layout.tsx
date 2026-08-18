// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/server/auth'
import { Sidebar, Header } from '@/components/layout'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import SidebarDrawer from '@/components/layout/SidebarDrawer'
import { VerifyEmailBanner } from '@/components/common/VerifyEmailBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  // Not /login: reaching here with no session means middleware saw a decodable
  // cookie and auth() rejected it (idle-expired, or revoked by a password
  // change). Sending such a request to /login makes middleware bounce it back
  // here for as long as the stale cookie exists. That route clears it first.
  if (!session) redirect('/api/auth/session-ended')

  return (
    // h-dvh, not min-h-screen: the shell is exactly the viewport so <main> is
    // the only scrolling element. With min-h-screen the shell could grow past
    // the viewport, the document itself scrolled, and the header went with it.
    //
    // dvh rather than screen (100vh), because on mobile 100vh means the
    // viewport *without* the collapsible URL bar — the shell ends up taller
    // than what is visible and the bottom of <main> sits under browser chrome.
    // Landscape is where it bites hardest, which is why the responsive check
    // has a landscape case.
    //
    // The header spans the full width and the sidebar sits beneath it as a
    // flex item, so the content takes the remaining space on its own — no
    // margin has to be kept in sync with the sidebar's width.
    <SidebarProvider>
      <div className="h-dvh bg-background flex flex-col overflow-hidden">
        <Header user={session.user} />

        {/* Outside <main> so it stays put while the page scrolls, and below the
            header so it never covers the nav. Renders nothing at all once the
            address is verified. */}
        <VerifyEmailBanner />

        {/* Below lg the sidebar is a drawer; the permanent column is
            display:none there, so only one nav is ever reachable. */}
        <SidebarDrawer />

        <div className="flex flex-1 min-h-0">
          <Sidebar />

          {/* Page content — scrollable. Horizontal padding matches the
              header's inner container so the content's left edge lines up
              with the breadcrumb above it. */}
          <main className="flex-1 min-w-0 overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 sm:py-6 min-h-full bg-background">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
