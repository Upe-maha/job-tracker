#Phase 5 = Authentication CRUD

#Step 1 — Applications API Route
- handels CRUD for the application [src/app/api/applications/route.ts]

##Step 2 — Single Application API Route
- This handles get, update and delete for one application. [src/app/api/applications/[id]/route.ts]

#Step 3 — Status Update API Route
-- This is called specifically when dragging a card between Kanban columns.[ src/app/api/applications/[id]/status/route.ts"]


#Step 4 — Add Application Modal Component [src/components/dashboard/AddApplicationModal.tsx]

#Step 5 — Application Card Component [src/components/dashboard/ApplicationCard.tsx]

#Step 6 — Applications Page [cat > "src/app/(dashboard)/applications/page.tsx" << 'EOF'
// placeholder — will be replaced below
EOF]

src/components/
├── layout/
│   ├── Sidebar.tsx        ← navigation sidebar
│   ├── Header.tsx         ← top header with user menu
│   └── index.ts           ← export both
│
├── applications/
│   ├── ApplicationCard.tsx   ← single job card
│   ├── AddApplicationModal.tsx ← add job form
│   ├── KanbanBoard.tsx       ← board with columns
│   └── index.ts              ← export all three
│
├── dashboard/             ← stats, notes feed (Phase 8)
│   └── (coming later)
│
└── ui/                    ← shadcn components (auto generated)


Before → everything in dashboard/ folder, page doing too much
After  → layout/ owns navigation, applications/ owns job UI

Overflow fix → overflow-x-auto on KanbanBoard wrapper
               overflow-hidden on root layout
               min-w-0 on the right panel
               minWidth: max-content on the columns row

##Added the themes color 
globals.css
  :root {}    ← light theme variables
  .dark {}    ← dark theme variables

ThemeProvider
  → reads localStorage on mount
  → adds/removes .dark class on <html>
  → saves preference to localStorage

ThemeToggle button
  → calls toggleTheme()
  → switches between dark and light instantly

All components
  → use bg-card, text-foreground, border-border etc
  → CSS variables change automatically when .dark is toggled
  → no component needs to know which theme is active