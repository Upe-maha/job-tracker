// src/components/landing/sections/BoardPreview.tsx
import { APPLICATION_STATUS_META } from '@/lib/display'
import { APPLICATION_STATUSES } from '@/lib/schemas/enums'
import { cn } from '@/lib/utils'

// A miniature of the real Kanban board, built from the same
// APPLICATION_STATUS_META the board itself uses — so the preview and the
// product cannot drift apart in colour, and adding a status colours this in
// automatically rather than leaving a blank column.
//
// The companies are obviously invented, and that is fine: this illustrates a
// layout, it does not claim to be anyone's data. Nothing here is presented as
// real usage.
const CARDS: Record<string, { company: string; role: string }[]> = {
  wishlist: [{ company: 'Northwind', role: 'Frontend Engineer' }],
  applied: [
    { company: 'Contoso', role: 'Full Stack Developer' },
    { company: 'Fabrikam', role: 'React Engineer' },
  ],
  interview: [{ company: 'Tailspin', role: 'Product Engineer' }],
  offer: [{ company: 'Proseware', role: 'Software Engineer' }],
  rejected: [],
}

// Below `sm` the last two columns are dropped rather than squeezed. Five
// columns in 375px leaves each about 60px wide, which renders the company names
// as illegible smears — three legible columns communicate "a board with stages"
// far better than five unreadable ones, and this is an illustration rather than
// data. The alternative, a horizontally scrolling strip, would fight the page's
// own scroll under a thumb.
const MOBILE_COLUMNS = 3

export default function BoardPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn('grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3', className)}
      // Decorative in aggregate: the surrounding copy carries the meaning, and
      // reading five columns of invented company names adds nothing.
      aria-hidden
    >
      {APPLICATION_STATUSES.map((status, i) => {
        const meta = APPLICATION_STATUS_META[status]
        const cards = CARDS[status] ?? []

        return (
          <div
            key={status}
            className={cn('min-w-0', i >= MOBILE_COLUMNS && 'hidden sm:block')}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', meta.dot)} />
              <span className="text-[10px] sm:text-xs text-foreground/70 truncate">
                {meta.label}
              </span>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              {cards.map(card => (
                <div
                  key={card.company}
                  className={cn(
                    'rounded-lg border p-1.5 sm:p-2.5 min-w-0',
                    'bg-card/70 border-border',
                  )}
                >
                  <p className="text-[10px] sm:text-xs font-medium text-foreground truncate">
                    {card.company}
                  </p>
                  <p className="text-[9px] sm:text-[11px] text-muted-foreground truncate">
                    {card.role}
                  </p>
                </div>
              ))}

              {cards.length === 0 && (
                <div
                  className={cn(
                    'rounded-lg border border-dashed h-10 sm:h-14',
                    meta.emptyBorder,
                  )}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
