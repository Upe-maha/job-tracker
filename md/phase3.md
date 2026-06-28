# Phase 3 — Authentication

## NextAuth Configuration
Set up NextAuth.js with JWT sessions and credentials provider for email/password authentication.

## Register API Route
POST `/api/auth/register` — accepts name, email, password; hashes password with bcrypt; creates user in MongoDB.

## Login Functionality
Credentials validation using bcrypt comparison; returns user session with id, name, email, and photo.

## Session Provider
Wraps app with SessionProvider and React Query client for accessing session data anywhere.

## Auth Pages
- **Register Page**: Form with name, email, password; redirects to login on success
- **Login Page**: Email/password form; uses signIn() from NextAuth; redirects to dashboard

## Route Protection
Middleware checks authentication status; redirects unauthenticated users away from dashboard routes and authenticated users away from auth pages.

## Type Extensions
Extended NextAuth types to include custom user fields (id, photo) in session.

## Root Redirect
Root page (`/`) automatically redirects to dashboard if logged in, otherwise to login.

## Key Components
- `src/lib/auth.ts` — NextAuth configuration
- `src/middleware.ts` — Route protection
- `src/app/api/auth/[...nextauth]/route.ts` — Auth API handler
- `src/app/api/auth/register/route.ts` — Registration API
- `src/app/(auth)/login/page.tsx` — Login UI
- `src/app/(auth)/register/page.tsx` — Register UI
- `src/components/providers.tsx` — Session wrapper

Endpoint	Method	Purpose
/api/auth/[...nextauth]	GET/POST	NextAuth internal handler
/api/auth/register	POST	Create new user account
/api/auth/callback/credentials	POST	Authenticate user login
/api/auth/session	GET	Get current session data
/api/auth/signout	GET/POST	Sign out user
/api/auth/csrf	GET	Get CSRF token
/api/auth/providers	GET	List auth providers