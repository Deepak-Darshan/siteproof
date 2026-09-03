@AGENTS.md

# SiteProof

Subcontractor punch-list and photo verification PWA for construction sites. Tradies snap before/after photos, pin them to blueprints, and generate tamper-proof PDF sign-off sheets.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS, mobile-first
- **Backend:** Supabase (Auth, Postgres, Storage, Row Level Security)
- **PDF:** @react-pdf/renderer (client-side generation)
- **PWA:** Serwist (service worker + install prompt)
- **Validation:** Zod schemas for all API inputs
- **Deploy:** Vercel

## Architecture

- Thin API pattern: most reads go direct client → Supabase JS SDK, protected by RLS
- API routes (`src/app/api/`) only for multi-step transactions and signed upload URLs
- PDF generation is fully client-side — no server resources, works offline
- Blueprint pin coordinates stored as normalised 0–1 floats (resolution-independent)
- Photos stored in Supabase Storage; metadata (EXIF timestamp, GPS) extracted client-side

## Project Structure

- `src/app/(auth)/` — login, signup pages
- `src/app/(dashboard)/` — authenticated pages (project list, project detail, blueprint viewer, punch list, report)
- `src/app/api/` — API routes (projects, items, upload)
- `src/components/` — reusable components (BlueprintViewer, PhotoCapture, PunchItemCard, ReportDocument)
- `src/components/ui/` — base UI primitives (Button, Input, Modal)
- `src/lib/supabase/` — client.ts (browser), server.ts (server components), middleware.ts
- `src/lib/validators.ts` — Zod schemas
- `src/hooks/` — custom hooks (useCamera, useProject, usePunchItems)
- `src/types/database.ts` — generated Supabase types
- `supabase/migrations/` — SQL migration files (version-controlled)

## Database Tables

profiles, projects, project_members, blueprints, punch_items, photos, activity_log.
See `supabase/migrations/001_initial_schema.sql` for full schema.
RLS is enabled on all tables — never bypass it from client code.

## Conventions

- All new database changes go in `supabase/migrations/`
- Supabase types regenerated with `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
- API inputs validated with Zod before any DB call
- Components use `"use client"` only when they need browser APIs (camera, interactivity)
- Server Components are the default
- Minimum touch target: 44px for all interactive elements
- Image compression before upload: canvas resize to max 1920px wide

## Current Sprint

**Week 3 — Photo Capture & Item Flow**
- [ ] PhotoCapture component (MediaDevices.getUserMedia)
- [ ] EXIF extraction (timestamp, GPS) with exifr
- [ ] Photo upload to Supabase Storage + photos table
- [ ] Punch item detail page (description, severity, trade, before photo)
- [ ] Resolve flow (sub uploads after photo, status → in_review)
- [ ] Punch list view with filters (by status, severity, trade)
- [ ] Activity log inserts for audit trail

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint check
