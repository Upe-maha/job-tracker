// src/lib/display/user.ts
import { JOB_SEARCH_STATUSES } from '@/lib/schemas/enums'
import type { JobSearchStatus } from '@/lib/schemas/enums'

export const JOB_SEARCH_STATUS_LABELS: Record<JobSearchStatus, string> = {
  actively_looking: 'Actively Looking',
  open: 'Open to Offers',
  not_looking: 'Not Looking',
}

export const JOB_SEARCH_STATUS_OPTIONS = JOB_SEARCH_STATUSES.map(value => ({
  value,
  label: JOB_SEARCH_STATUS_LABELS[value],
}))

// The two currency dropdowns had drifted: the application modal offered
// USD/NPR/EUR/GBP and the profile page offered those plus INR, so a user could
// set a preferred currency they could not then pick on an application. This is
// the union, and now the only list.
//
// Not an enum in @/lib/schemas: the schema rule is /^[A-Z]{3}$/, deliberately
// open so a stored value from elsewhere is never rejected. This is only what
// the pickers offer.
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'NPR', name: 'Nepali Rupee' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
] as const

export const DEFAULT_CURRENCY = 'USD'
