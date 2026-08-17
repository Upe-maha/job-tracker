import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BRAND } from '@/components/landing/content/copy'

// The way back out. Someone who followed "Sign in" from the landing page and
// then decided to keep reading had no route back except the browser's Back
// button — every auth page was a dead end.
//
// It lives in the layout rather than in login and register individually: the
// same escape hatch is wanted on forgot-password and on the two token pages,
// and six copies of one link is how they drift. The card stays vertically
// centred because the link is a flex item in the same column, not an overlay.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 p-4">
      <Link
        href="/"
        className="
          inline-flex items-center gap-2 rounded-full border border-border
          px-4 py-2 text-sm text-muted-foreground
          transition-colors duration-150 hover:text-foreground hover:bg-accent
          motion-reduce:transition-none
        "
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to {BRAND.name}
      </Link>

      {children}
    </main>
  )
}
