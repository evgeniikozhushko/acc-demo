# ACC Demo — Development Reference

## What this app is

A Next.js dashboard that simulates the Alpine Club of Canada's data integration problem:
incoming registrations from 3 messy source systems → validated → synced to HubSpot CRM.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router + TypeScript strict |
| UI | Tailwind CSS v4 + Shadcn/UI (New York, zinc) |
| Database | Prisma 7 + PostgreSQL (Neon) |
| API | HubSpot Private App (real, live) |
| Auth | None (public dashboard, demo context) |
| Notifications | Sonner toasts |
| Icons | Lucide React |

---

## Environment variables

Create `.env.local` in the project root:

```bash
# HubSpot Private App token (already created)
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-...

# PostgreSQL — get from Vercel > Storage > Neon, then: vercel env pull .env.local
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

---

## Getting started

```bash
# Install dependencies
npm install

# Generate Prisma client (after any schema change)
npm run db:generate

# Run DB migration (first time, or after schema changes — needs DATABASE_URL)
npm run db:migrate

# Seed with demo data (17 messy ACC registrations + field mappings)
npm run db:seed

# Start dev server
npm run dev
```

---

## Database scripts

```bash
npm run db:generate   # Regenerate Prisma client types (src/generated/prisma/)
npm run db:migrate    # Run pending migrations (creates migration files)
npm run db:migrate:deploy # Apply committed migrations (CI/production)
npm run db:status     # Show migration and connection status
npm run db:push       # Push schema without migration files (rapid prototyping)
npm run db:seed       # Seed with ACC demo data
npm run db:studio     # Open Prisma Studio (DB browser UI)
```

---

## Current build status

### Done
- [x] Step 1 — Dashboard shell (layout, sidebar, 5 routes)
- [x] Step 2 — HubSpot health check (`/api/hubspot/health` + Settings button)
- [x] Step 3 — Data model + seed data
  - `prisma/schema.prisma` — 4 models: Registration, SyncRun, SyncRecord, FieldMapping
  - `src/lib/types.ts` — SourceType, ValidationStatus, SyncStatus, payload types
  - `src/lib/db.ts` — Prisma singleton (server-only, uses `@prisma/adapter-pg`)
  - `prisma/seed.ts` — 17 registrations (7 courses, 5 hut bookings, 5 memberships)
- [x] Step 4 — Registrations page + validation engine
  - `src/server/registrations/validation.ts` — BLOCKED / WARNING / VALID rules + duplicate detection
  - `src/server/registrations/canonical.ts` — canonicalization + phone/section normalization
  - `src/server/registrations/hubspot-payload.ts` — HubSpot contact properties builder
  - `src/server/registrations/query.ts` — load, validate, persist, return view model
  - `src/components/dashboard/registrations-table.tsx` — filter tabs + table + preview sheet
  - `src/app/dashboard/registrations/page.tsx` — RSC page (force-dynamic)

### Blocked on
- `DATABASE_URL` needed to run `prisma migrate dev --name init` and `npm run db:seed`
- Get it via: Vercel > your project > Storage > Neon Postgres > then `vercel env pull .env.local`

### Next (Step 5)
- Sync engine: real HubSpot upsert
- `POST /crm/v3/objects/contacts/batch/upsert` with `idProperty: "email"`
- Sync run tracking (create SyncRun + SyncRecord rows)

---

## Build plan summary

| Step | Feature | Status |
|------|---------|--------|
| 1 | Dashboard shell + routing | Done |
| 2 | HubSpot connectivity | Done |
| 3 | Prisma schema + seed data | Done (needs DB migration) |
| 4 | Registrations page + validation UI | Done |
| 5 | Sync engine (real HubSpot upsert) | Pending |
| 6 | Sync Runs page (history + retry) | Pending |
| 7 | Mappings page (field config) | Pending |
| 8 | Waiver tracking operational touch | Pending |
| 9 | Overview page (live stats) | Pending |
| 10 | Sentry error monitoring (optional) | Pending |

---

## Key files

```
src/
├── app/
│   ├── api/hubspot/health/route.ts       # HubSpot connectivity check
│   ├── dashboard/
│   │   ├── layout.tsx                    # Sidebar nav layout
│   │   ├── page.tsx                      # Overview (placeholder → Step 9)
│   │   ├── registrations/page.tsx        # Registrations (placeholder → Step 4)
│   │   ├── sync-runs/page.tsx            # Sync history (placeholder → Step 6)
│   │   ├── mappings/page.tsx             # Field mappings (placeholder → Step 7)
│   │   └── settings/
│   │       ├── page.tsx                  # HubSpot test button
│   │       └── actions.ts               # testHubSpotHealthAction
│   └── layout.tsx                        # Root layout
├── components/
│   ├── ui/                               # shadcn/ui: button, card, badge, table, etc.
│   └── dashboard/
│       └── hubspot-test-button.tsx       # Client component
├── lib/
│   ├── db.ts                             # Prisma client singleton
│   ├── types.ts                          # Domain types + payload shapes
│   └── utils.ts                          # cn() utility
└── server/
    └── hubspot/
        ├── client.ts                     # hubspotFetch() with Bearer token
        └── health.ts                     # hubspotHealthCheck()

prisma/
├── schema.prisma                         # DB schema (4 models)
├── seed.ts                               # Demo data seeder
└── migrations/                           # Created after first migrate dev
```

---

## Seed data story

The seed intentionally includes real-world data quality problems:

| Problem | Example |
|---------|---------|
| Missing waiver | Priya Sharma (COURSE), Ingrid Bergstrom (HUT_BOOKING) → BLOCKED |
| Empty membershipType | Fatima Hussain (MEMBERSHIP) → BLOCKED |
| Missing emergencyContact | Priya Sharma, Fatima Hussain → WARNING |
| Cross-system duplicate | `amara.diallo@email.com` appears in all 3 source systems |
| Section name variants | Calgary / YYC Section / YYC / Calgary Section (4 variants, same section) |
| Phone format chaos | 5 different formats: `403-555-0101`, `+14035550203`, `6049870044`, `(780) 555-0312`, `+1 403 555 0654` |

---

## Architecture

```
Next.js Dashboard (RSC + Server Actions)
    │
    ├── Source Adapters (mock data)
    │   ├── Hapily Adapter  → COURSE registrations
    │   ├── Mews Adapter    → HUT_BOOKING registrations
    │   └── Sections Adapter → MEMBERSHIP registrations
    │
    ├── Validation Engine (VALID / WARNING / BLOCKED / DUPLICATE)
    │
    ├── Field Mapping Layer (DB-driven, editable)
    │
    ├── Sync Engine (upsert + idempotency + retry)
    │   └── HubSpot CRM (real API)
    │       └── POST /crm/v3/objects/contacts/batch/upsert
    │           (idProperty: "email")
    │
    └── PostgreSQL / Neon (Prisma 6)
        ├── registrations   — raw + validation + sync state
        ├── sync_runs       — batch job history
        ├── sync_records    — per-record audit trail
        └── field_mappings  — editable mapping config
```

---

## HubSpot notes

- Using **Private App token** (not OAuth) — stored in `HUBSPOT_PRIVATE_APP_TOKEN`
- Upsert endpoint: `POST /crm/v3/objects/contacts/batch/upsert` with `idProperty: "email"`
- Always send the **full properties set** on upsert (partial updates behave unexpectedly)
- The health check hits `/account-info/v3/details` — tests connectivity in Settings page

---

## Resuming

1. Get `DATABASE_URL` from Vercel (Storage > Neon) and put it in `.env.local`
   - Also set `HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-...`
2. Run `npx prisma migrate dev --name init`
3. Run `npm run db:seed`
4. Verify with `npm run db:studio` — should see 17 registrations
5. Start `npm run dev` — Registrations page should show 17 rows with status badges and preview drawer
6. Next: Step 5 — sync engine (real HubSpot upsert)

## Prisma 7 / pg adapter notes

Prisma 7 requires a driver adapter. This project uses `@prisma/adapter-pg` with a `pg.Pool`:

```ts
// src/lib/db.ts
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });
```

The `prisma.config.ts` file still drives CLI operations (migrate, seed) using `datasource.url`.
