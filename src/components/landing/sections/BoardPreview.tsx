// src/components/landing/sections/BoardPreview.tsx
import { APPLICATION_STATUS_META } from '@/shared/display'
import { APPLICATION_STATUSES } from '@/shared/schemas/enums'
import { cn } from '@/shared/utils'

// A miniature of the real board, built from the same APPLICATION_STATUS_META, so
// preview and product cannot drift. The companies are obviously invented.
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

// Below sm the last two columns are dropped rather than squeezed: five columns in
// 375px renders the company names as illegible smears.
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
