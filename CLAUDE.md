# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint via Next.js
```

## Architecture

**글또 4기 독서모임** — A book club web app for Geultto members.

### Stack

- **Next.js 16 App Router** with React 19, TypeScript
- **Supabase** (PostgreSQL + Auth) — direct JS client, no ORM
- **TanStack Query** for client-side server state
- **TipTap 3** (rich text editor, via private npm registry in `.npmrc`)
- **Three.js / @react-three/fiber** for 3D visuals on homepage and quotes page
- **Tailwind CSS 4 + Radix UI** for styling

### Path Aliases

- `@/*` → `./src/*`
- `@supabase/*` → `./supabase/*`

### Directory Layout

```
src/
  app/             # Next.js App Router pages & API routes
    (public)/      # Public route group (homepage, auth)
    (member)/      # Protected routes (reviews, topics, quotes, profile)
    admin/         # Admin-only routes (schedule, attendees, user management)
    api/           # API route handlers
  components/      # Shared React components
  lib/             # Utilities and auth helpers
supabase/
  client.ts        # Browser Supabase client
  server.ts        # Server-side Supabase client
  middleware.ts    # OAuth callback & session refresh
  types.ts         # Auto-generated DB types
  schema.sql       # Database schema source of truth
```

### Auth & Session

- **Kakao OAuth** via Supabase Auth
- Three roles: `pending` | `member` | `admin`
- Server: `getSessionUser()` in `src/lib/auth.ts` (cached with `React.cache`)
- Client: `useSession()` hook via `SessionProvider` context (`src/components/SessionProvider.tsx`)
- `ensureRole()` helper redirects unauthorized users from page routes
- API routes check `sessionUser.role` and return 403 if unauthorized

### Data Flow

1. `src/middleware.ts` intercepts all requests to refresh Supabase session and handle OAuth callbacks
2. Server components call `createSupabaseServerClient()` for direct DB access
3. Client components use the Supabase client from `SessionProvider` context
4. Mutations go through API routes (`/api/...`), which validate session and write to DB

### Database

Tables: `users`, `schedules`, `schedule_attendees`, `reviews`, `review_comments`, `review_reactions`, `review_highlights`, `topics`, `topic_comments`, `quotes`, `quote_reactions`

All tables have Row-Level Security (RLS) enabled. See `supabase/schema.sql` for full schema.
