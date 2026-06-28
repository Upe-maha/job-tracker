# Phase 4 — Dashboard Layout & Sidebar

## Dashboard Layout
- Wraps all dashboard pages with authentication check
- Sidebar + Header + Main content structure
- Redirects to login if not authenticated

## Sidebar Component
- Fixed navigation sidebar (w-64)
- Navigation items: Dashboard, Applications, Notes, Analytics, Profile, Settings
- Active link highlighting using usePathname
- Logo and version footer

## Header Component
- Displays page title based on current route
- User avatar with initials fallback
- Dropdown menu with Profile, Settings, Sign Out
- Shows user name and email

## Placeholder Pages
- Created for all dashboard routes to prevent 404
  - `/dashboard` — Phase 8 placeholder
  - `/applications` — Phase 5 placeholder
  - `/notes` — Phase 7 placeholder
  - `/analytics` — Phase 8 placeholder
  - `/profile` — Phase 5 placeholder
  - `/settings` — Later phase placeholder

## Key Components
- `src/app/(dashboard)/layout.tsx` — Dashboard shell
- `src/components/dashboard/Sidebar.tsx` — Navigation sidebar
- `src/components/dashboard/Header.tsx` — Top header with user menu

## Testing Checklist
- [ ] Sidebar visible on left
- [ ] Header shows user name
- [ ] Navigation links work
- [ ] Avatar dropdown opens
- [ ] Sign out redirects to login
- [ ] Active link highlighted in blue