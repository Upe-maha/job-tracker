// src/hooks/useQueries.ts
'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { apiGet } from '@/client/api-client'
import { qk } from '@/client/query-keys'
import type { NoteFilterKey } from '@/shared/display'
import type {
  IApplication,
  IDashboardResponse,
  INoteFeedItem,
  IUser,
} from '@/types'

// One definition per key. Two pages once wrote the *same* ['profile'] key with
// different failure handling, so whichever mounted first decided what the cache held.

export function useApplications() {
  return useQuery({
    queryKey: qk.applications.all,
    queryFn: () => apiGet<IApplication[]>('/api/applications'),
  })
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: qk.applications.detail(id),
    queryFn: () => apiGet<IApplication>(`/api/applications/${id}`),
    enabled: Boolean(id),
  })
}

// Backs both the dashboard and analytics. They used to register the same key with
// different options, so polling depended on which page was mounted.
export function useDashboard() {
  return useQuery({
    queryKey: qk.dashboard,
    queryFn: () => apiGet<IDashboardResponse>('/api/dashboard'),
  })
}

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: () => apiGet<IUser>('/api/user/profile'),
  })
}

interface NotesPage {
  notes: INoteFeedItem[]
  nextPage: number | null
}

export function useNotesFeed(filter: NoteFilterKey) {
  return useInfiniteQuery({
    queryKey: qk.notes(filter),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam) })
      // 'all' is a UI-only pseudo-filter and must never reach the API, whose
      // schema accepts only real NoteType members.
      if (filter !== 'all') params.set('type', filter)
      return apiGet<NotesPage>(`/api/notes?${params}`)
    },
    initialPageParam: 0,
    getNextPageParam: last => last.nextPage,
  })
}
