// src/components/dashboard/StatsGrid.tsx
'use client'

import {
  Briefcase,
  Star,
  Send,
  MessageSquare,
  Trophy,
  XCircle,
} from 'lucide-react'

interface Stats {
  total: number
  wishlist: number
  applied: number
  interview: number
  offer: number
  rejected: number
}

interface StatsGridProps {
  stats: Stats
}

const statCards = [
  {
    key: 'total',
    label: 'Total',
    icon: Briefcase,
    color: 'text-foreground',
    bg: 'bg-muted',
    border: 'border-border',
  },
  {
    key: 'wishlist',
    label: 'Wishlist',
    icon: Star,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    border: 'border-border',
  },
  {
    key: 'applied',
    label: 'Applied',
    icon: Send,
    color: 'text-stage-applied-fg',
    bg: 'bg-stage-applied',
    border: 'border-stage-applied-fg/20',
  },
  {
    key: 'interview',
    label: 'Interview',
    icon: MessageSquare,
    color: 'text-stage-interview-fg',
    bg: 'bg-stage-interview',
    border: 'border-stage-interview-fg/20',
  },
  {
    key: 'offer',
    label: 'Offer',
    icon: Trophy,
    color: 'text-stage-offer-fg',
    bg: 'bg-stage-offer',
    border: 'border-stage-offer-fg/20',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
  },
]

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map(card => {
        const Icon = card.icon
        const value = stats[card.key as keyof Stats]

        return (
          <div
            key={card.key}
            className={`
              bg-card border rounded-xl p-4
              flex flex-col gap-3
              ${card.border}
            `}
          >
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center
              ${card.bg}
            `}>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.label}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}