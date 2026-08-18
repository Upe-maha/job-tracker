import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BRAND } from '@/components/landing/content/copy'

// The way back out: every auth page was a dead end for someone who followed "Sign in"
// and then wanted to keep reading. In the layout rather than per page, because six
// copies of one link is how they drift.
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
