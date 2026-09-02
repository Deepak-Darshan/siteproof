# SiteProof — Project Plan

Subcontractor punch-list and photo verification for construction sites. A fraud-proof, mobile-first PWA that links defect photos to architectural blueprints and generates timestamped PDF sign-off sheets.

**Solo Build · Next.js PWA · 6-Week Sprint · Sep 2026**

---

## 1. Problem & Opportunity

General contractors on construction projects struggle to verify that subcontractor work has been completed correctly before authorizing payment. The current process relies on physical walkthroughs, clipboard checklists, and photos emailed back and forth with no link to the actual plans. This leads to three costly problems: **payment disputes** between GCs and subcontractors over whether work was actually done, **rework** when defects are discovered late because documentation was unclear, and **compliance liability** when there is no auditable record of inspection.

The Australian construction industry alone generates over A$380 billion annually, and punch-list management sits at the intersection of every project handover. Existing solutions (PlanGrid, Fieldwire, Procore) target large enterprises with complex licensing. **Small-to-mid GCs running 2–15 active jobs have no affordable, mobile-first tool for this workflow.**

> **One-liner pitch:** SiteProof lets any tradie snap a photo, pin it to the blueprint, and generate a tamper-proof PDF sign-off — replacing the clipboard, the email thread, and the payment dispute in one tap.

---

## 2. Users & Personas

**The General Contractor** — Manages 3–10 subcontractors per job. Needs proof of completed work before releasing payment. Reviews punch lists on their phone between site visits. Exports PDF reports for clients and insurers.

**The Subcontractor** — An electrician, plumber, or carpenter who wants to log their completed work quickly so they can get paid faster. Takes before/after photos on their phone. Doesn't want to learn a complicated app.

**The Site Supervisor** — Walks the site daily. Flags defects by photographing them and pinning them to the plan. Assigns fix-up tasks to specific trades. Needs to work even when cell reception is poor.

**The Client / Owner** — Receives the final PDF report as proof that all punch-list items were resolved before handover. Doesn't use the app directly — they receive the export.

---

## 3. Feature Scope

### MVP — Ship in 6 Weeks

- **Auth & Teams** — Email/password sign-up via Supabase Auth. Invite subcontractors to a project by email. Role-based access: admin (GC) vs. member (sub).
- **Project Dashboard** — Create and list projects. Each project has a name, address, and status. Summary cards showing total/open/resolved items.
- **Blueprint Upload** — Upload floor plans as images (JPG/PNG) or PDF pages. Pan and zoom on mobile. Multiple sheets per project (ground floor, level 1, etc.).
- **Defect Pinning** — Tap a spot on the blueprint to create a punch-list item. Capture before photo from camera, add description, assign severity (critical/major/minor) and trade.
- **Photo Capture** — Use the device camera API for in-app photo capture. Auto-embed EXIF timestamp and GPS coordinates. Support gallery upload as fallback.
- **Resolve & After Photo** — Subcontractors mark items resolved with an "after" photo. GC reviews and accepts or rejects. Audit trail of status changes with timestamps.
- **PDF Report Generation** — One-tap export: a branded PDF with the blueprint marked up, before/after photo pairs, timestamps, GPS data, and a summary table. Generated client-side.
- **PWA Install** — Add-to-home-screen prompt. Service worker for asset caching. Works on Android and iOS Safari. App-like full-screen experience.

### Post-MVP — V2 Features

Offline-first with background sync, push notifications when items are assigned or resolved, real-time collaboration via Supabase Realtime, hash-chain integrity (each report's SHA-256 references the previous), digital signatures, and an analytics dashboard showing defect trends per trade.

---

## 4. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 15 (App Router) | Server Components, API routes, SSR |
| Language | TypeScript | End-to-end type safety |
| Backend | Supabase | Auth, Postgres DB, Storage, Row Level Security |
| Styling | Tailwind CSS | Utility-first, fast iteration on mobile-first layouts |
| PWA | Serwist | Next.js PWA integration, service worker, install prompt |
| PDF | @react-pdf/renderer | Client-side PDF generation with React components |
| Validation | Zod | Schema validation for API inputs and form data |
| Deploy | Vercel | Deploy on push, free tier covers MVP traffic |

**Why Supabase over Firebase?** Postgres gives you relational integrity (foreign keys between projects, items, and photos), proper SQL queries for reporting, and Row Level Security policies that map naturally to "GC can see everything on their project, sub can only see their assignments." The free tier includes 1GB storage, 50K monthly active users, and 500MB database.

---

## 5. Architecture

```
┌─────────────────────────────────────────────────┐
│  CLIENT                                         │
│  Next.js PWA          Camera API     PDF Engine  │
│  (App Router +        (getUserMedia) (@react-pdf │
│   Service Worker)                    /renderer)  │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  API LAYER                                      │
│  Next.js API Routes       Supabase Client SDK   │
│  (/api/projects,          (Auth + Realtime)      │
│   /api/items, /api/upload)                      │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  DATA & STORAGE                                 │
│  Postgres        Supabase Storage    Row Level   │
│  (projects,      (photos &           Security    │
│   items, users,   blueprints)        (per-project│
│   audit log)                          policies)  │
└─────────────────────────────────────────────────┘
```

**Thin API pattern:** Most reads go directly from the client to Supabase via the JS SDK, protected by Row Level Security. API routes handle operations that need server-side validation or multi-step transactions (creating a project and adding the creator as admin, generating signed upload URLs for photos). PDF generation happens entirely client-side — no server resources needed, and it works offline once the data is cached.

---

## 6. Database Schema

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | References auth.users |
| full_name | text | |
| company | text | Trade/company name |
| role | text | 'gc' or 'sub' |
| created_at | timestamptz | Default now() |

### projects
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| name | text | "Unit 4B Bathroom Reno" |
| address | text | Site address |
| status | text | 'active' \| 'completed' \| 'archived' |
| owner_id | uuid FK | → profiles.id (the GC) |
| created_at | timestamptz | |

### project_members
| Column | Type | Notes |
|--------|------|-------|
| project_id | uuid FK | → projects.id |
| user_id | uuid FK | → profiles.id |
| role | text | 'admin' \| 'member' |
| invited_at | timestamptz | |

### blueprints
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK | → projects.id |
| label | text | "Ground Floor", "Level 1" |
| file_path | text | Supabase Storage path |
| width | integer | Original image width (px) |
| height | integer | Original image height (px) |

### punch_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK | → projects.id |
| blueprint_id | uuid FK | → blueprints.id |
| title | text | "Cracked tile near entry" |
| description | text | Optional longer notes |
| severity | text | 'critical' \| 'major' \| 'minor' |
| trade | text | 'electrical' \| 'plumbing' \| etc. |
| status | text | 'open' \| 'in_review' \| 'resolved' |
| pin_x | float | 0–1 normalised X on blueprint |
| pin_y | float | 0–1 normalised Y on blueprint |
| assigned_to | uuid FK | → profiles.id (nullable) |
| created_by | uuid FK | → profiles.id |
| created_at | timestamptz | |
| resolved_at | timestamptz | Nullable |

### photos
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| item_id | uuid FK | → punch_items.id |
| type | text | 'before' \| 'after' |
| file_path | text | Supabase Storage path |
| taken_at | timestamptz | EXIF or capture time |
| lat | float | GPS latitude (nullable) |
| lng | float | GPS longitude (nullable) |
| uploaded_by | uuid FK | → profiles.id |

### activity_log
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK | → projects.id |
| item_id | uuid FK | → punch_items.id (nullable) |
| user_id | uuid FK | → profiles.id |
| action | text | 'created' \| 'photo_added' \| 'resolved' \| 'reopened' |
| metadata | jsonb | Flexible payload for diff data |
| created_at | timestamptz | |

---

## 7. Repo Structure

```
siteproof/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout + providers
│   │   ├── page.tsx                # Landing / login redirect
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Sidebar + nav
│   │   │   ├── projects/page.tsx   # Project list
│   │   │   └── projects/[id]/
│   │   │       ├── page.tsx        # Project overview
│   │   │       ├── blueprint/page.tsx  # Blueprint viewer + pins
│   │   │       ├── items/page.tsx  # Punch list table
│   │   │       └── report/page.tsx # PDF preview + download
│   │   └── api/
│   │       ├── projects/           # CRUD + member invites
│   │       ├── items/              # Punch item operations
│   │       └── upload/             # Signed URL generation
│   ├── components/
│   │   ├── ui/                     # Button, Input, Modal, etc.
│   │   ├── BlueprintViewer.tsx     # Pan/zoom/pin canvas
│   │   ├── PhotoCapture.tsx        # Camera + EXIF extraction
│   │   ├── PunchItemCard.tsx       # Item display component
│   │   ├── SeverityBadge.tsx
│   │   └── ReportDocument.tsx      # @react-pdf/renderer template
│   ├── lib/
│   │   ├── supabase/client.ts      # Browser Supabase client
│   │   ├── supabase/server.ts      # Server-side client
│   │   ├── supabase/middleware.ts   # Auth session refresh
│   │   └── validators.ts           # Zod schemas
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useProject.ts
│   │   └── usePunchItems.ts
│   └── types/
│       └── database.ts             # Generated from Supabase
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service worker (Serwist)
│   └── icons/                      # PWA icons 192 + 512
├── supabase/
│   ├── migrations/                 # SQL migration files
│   └── seed.sql                    # Demo data for development
├── .env.local.example
├── middleware.ts                    # Next.js middleware (auth guard)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 8. Sprint Plan

Six weeks, working roughly 15–20 hours per week alongside coursework. Each week has a clear deliverable you could demo.

### Week 1 — Foundation
**Deliverable:** login, create a project, see it on the dashboard

- Scaffold Next.js + TypeScript + Tailwind project
- Set up Supabase project (auth, database, storage bucket)
- Write initial migration: profiles, projects, project_members tables
- Build auth flow: signup, login, protected route middleware
- Build project CRUD: create project form, project list page
- Set up Vercel deployment with preview branches
- Configure PWA manifest and service worker shell

### Week 2 — Blueprint Viewer
**Deliverable:** upload a floor plan, pan/zoom it, tap to place a pin

- Build file upload to Supabase Storage (signed URLs)
- Build BlueprintViewer component with touch pan/zoom (CSS transforms or a lightweight library like panzoom)
- Implement tap-to-pin: normalised coordinates stored as 0–1 floats
- Write migration: blueprints, punch_items tables
- Build the "create punch item" modal triggered by a pin tap
- Render pins as markers overlaid on the blueprint at correct positions

### Week 3 — Photo Capture & Item Flow
**Deliverable:** create a defect with camera photo, view item detail with before/after

- Build PhotoCapture component using MediaDevices.getUserMedia
- Extract EXIF data (timestamp, GPS) client-side with exifr library
- Upload photos to Supabase Storage, write metadata to photos table
- Build punch item detail page: description, severity badge, assigned trade, before photo
- Build "resolve" flow: sub uploads after photo, status moves to in_review
- Build punch list view: filterable table/list of all items for a project
- Write activity_log triggers or inserts for audit trail

### Week 4 — PDF Report & Team Invites
**Deliverable:** generate a branded PDF, invite a subcontractor to the project

- Build ReportDocument with @react-pdf/renderer: cover page with project details, blueprint with pin markers, before/after photo pairs, summary table of all items
- Add timestamp and GPS metadata to each photo entry in the PDF
- Build PDF preview page with download button
- Build invite flow: admin enters email, creates project_members row, sends invite (Supabase Auth magic link or simple email)
- Implement Row Level Security policies: project members can read their projects, only admins can delete or invite

### Week 5 — Polish & Mobile UX
**Deliverable:** feels like a real app on a phone, not a student project

- Mobile UX pass: bottom navigation, touch-friendly tap targets (min 44px), swipe gestures on list items
- Loading states, skeleton screens, error boundaries
- Empty states with clear CTAs ("No items yet — tap the blueprint to add one")
- PWA install prompt + add-to-homescreen flow
- Image compression before upload (canvas resize to max 1920px wide)
- Test on real Android phone and iOS Safari
- Add seed.sql with realistic demo data for pitch demos

### Week 6 — Demo & Pitch Prep
**Deliverable:** a project you can demo live and talk about with confidence

- End-to-end test: create project → upload blueprint → pin defects → capture photos → resolve → generate PDF
- Record a 90-second demo video (screen recording on phone)
- Write a compelling README with screenshots, tech stack, and architecture diagram
- Prepare pitch deck: problem, solution, demo, market size, business model, roadmap
- Deploy final version to a custom domain (siteproof.app or similar)
- Optional: get one real tradie or builder to try it and give a testimonial quote

---

## 9. Pitch Angles

### For recruiters and portfolio reviewers
Emphasise the engineering decisions, not just the features. Talk about **why** you chose normalised coordinates for pin positions (resolution-independent, works when blueprint is swapped), why you do PDF generation client-side (offline capability, no server cost), why Row Level Security over application-level auth checks (defence in depth, impossible to bypass from the client). Show the database schema and explain the trade-offs. Mention that you tested on real devices, not just Chrome DevTools.

### For the pitch competition
**Lead with the cost of the problem:** payment disputes in Australian construction cost an estimated A$7.4B annually. Frame SiteProof as reducing dispute resolution time from weeks to minutes. **Demo live:** walk on stage, take a photo of "damage" to a printed blueprint, show it pinned on screen, generate the PDF in real time. **Business model:** freemium — free for 1 project with up to 50 items, A$29/month for unlimited projects (per-seat pricing kills adoption in construction). **Moat:** every project generates data that makes the next report faster (auto-suggesting trades, common defect types, severity patterns).

### For real users (if you pilot it)
Reach out to 2–3 local builders or renovation contractors. Offer it free. The pitch is simple: "You're already taking photos on your phone — this just puts them on the plan and gives you the sign-off sheet automatically." One real user with a real testimonial is worth more than any feature you could build.

---

## 10. Post-MVP Roadmap

- **Offline-First Sync** — IndexedDB cache for items and photos. Background sync when connection returns. Critical for sites with poor reception — and a strong technical talking point.
- **Hash-Chain Integrity** — Each PDF report includes a SHA-256 hash of its contents, referencing the previous report's hash. Tamper-evident chain that proves no photos were swapped after the fact.
- **Push Notifications** — Web Push API via service worker. Notify subs when they're assigned an item, notify GCs when an item is marked resolved.
- **Analytics Dashboard** — Defect trends per trade, average resolution time, most common defect types. Helps GCs identify which subcontractors need closer oversight.
- **AI Defect Detection** — Upload a photo, get auto-suggested severity and defect category via a vision model. Reduces manual input for the person on site.
- **Multi-Org & Billing** — Stripe integration for the freemium model. Organisation-level accounts with multiple GCs. Usage-based billing by project count.
