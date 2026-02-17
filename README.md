# ACC Demo — Registration Ingestion & HubSpot Sync

A full-stack dashboard that ingests member registration data from three separate Alpine Club of Canada (ACC) systems, validates and deduplicates it, then synchronizes clean records to HubSpot CRM.

Built as a technical demo to illustrate real-world ETL (Extract, Transform, Load) pipeline design using modern web technologies.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Tech Stack & Rationale](#2-tech-stack--rationale)
3. [System Architecture](#3-system-architecture)
4. [The Three Source Systems](#4-the-three-source-systems)
5. [Data Model](#5-data-model)
6. [The Processing Pipeline](#6-the-processing-pipeline)
   - [Validation](#61-validation)
   - [Deduplication](#62-deduplication)
   - [Canonicalization & Normalization](#63-canonicalization--normalization)
   - [HubSpot Payload Transformation](#64-hubspot-payload-transformation)
7. [HubSpot Integration](#7-hubspot-integration)
8. [Sync Orchestration](#8-sync-orchestration)
9. [Next.js Patterns](#9-nextjs-patterns)
10. [Key Technical Decisions & Trade-offs](#10-key-technical-decisions--trade-offs)
11. [The Demo Story](#11-the-demo-story)
12. [Local Setup](#12-local-setup)
13. [Deployment (Vercel + Neon)](#13-deployment-vercel--neon)

---

## 1. Problem Statement

The Alpine Club of Canada manages members across three completely separate third-party systems:

- **Hapily** — handles course and event registrations
- **Mews** — handles hut booking reservations
- **Sections** — manually maintained membership records per regional section

Each system has its own data schema, its own phone number formatting conventions, its own section name vocabulary, and no awareness of the others. The same person (e.g. "Amara Diallo") can appear in all three with slightly different data.

The goal of this app is to:
1. Ingest raw records from all three sources into a single database
2. Validate each record against business rules (waiver signed, email present, etc.)
3. Detect cross-system duplicates by email
4. Normalize inconsistent data (phone formats, section name variants) into a canonical shape
5. Push clean, unified contact records to HubSpot CRM

This is a common real-world problem: organizations that use multiple SaaS tools end up with fragmented customer data and need a purpose-built integration layer to unify it.

---

## 2. Tech Stack & Rationale

| Technology | Role | Why |
|---|---|---|
| **Next.js 16 (App Router)** | Full-stack framework | Single codebase for UI, server logic, and API. App Router enables co-located server components and server actions. |
| **React 19** | UI library | Latest stable with improved async rendering support |
| **TypeScript (strict mode)** | Type safety | The pipeline has many data shape transformations — types catch mismatches at compile time |
| **PostgreSQL** | Primary database | Relational model fits the audit trail requirements; JSON columns store raw source payloads |
| **Prisma 7** | ORM | Type-safe DB access with migration management; generated client matches schema exactly |
| **`@prisma/adapter-pg`** | DB driver adapter | Prisma 7 requires an explicit driver adapter; `pg` is the standard Node.js PostgreSQL driver |
| **Neon** | Hosted PostgreSQL | Serverless-friendly connection pooling, works well with Vercel's serverless functions |
| **Tailwind CSS v4** | Styling | Utility-first, no build step overhead for class generation |
| **shadcn/ui + Radix UI** | Component library | Accessible, unstyled primitives that integrate cleanly with Tailwind |
| **Sonner** | Toast notifications | Lightweight, zero-config toast library |
| **HubSpot Private App API** | CRM integration | OAuth-free access for internal tools; simpler than the full OAuth flow |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ACC Source Systems                        │
│   ┌──────────┐       ┌────────────┐       ┌──────────────────┐  │
│   │  Hapily  │       │    Mews    │       │ Sections (Manual) │  │
│   │ (Courses)│       │(Hut Bookings)│     │  (Memberships)   │  │
│   └────┬─────┘       └─────┬──────┘       └────────┬─────────┘  │
└────────┼─────────────────--┼──────────────────────-┼────────────┘
         │  rawData (JSON)   │                        │
         └───────────────────┼────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (Neon)                            │
│   registrations table — stores raw + validation + sync state     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Processing Pipeline                           │
│   1. Validate      → check business rules per source type        │
│   2. Deduplicate   → detect shared emails across all sources     │
│   3. Canonicalize  → normalize phone, section names, shape       │
│   4. Transform     → build HubSpot-shaped property object        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌───────────────────────┐  ┌────────────────────────────────────┐
│   Next.js Dashboard   │  │          HubSpot CRM               │
│  /registrations       │  │  Contacts created/updated via      │
│  /sync-runs           │  │  batch upsert API (by email)       │
│  /settings            │  └────────────────────────────────────┘
└───────────────────────┘
```

### Layer Breakdown

| Layer | Files | Responsibility |
|---|---|---|
| **Types** | `src/lib/types.ts` | Shared TypeScript types for all domain values |
| **Database client** | `src/lib/db.ts` | Prisma singleton with connection pooling |
| **Validation** | `src/server/registrations/validation.ts` | Business rule checks, deduplication detection |
| **Canonicalization** | `src/server/registrations/canonical.ts` | Normalize data into a unified shape |
| **HubSpot payload** | `src/server/registrations/hubspot-payload.ts` | Transform canonical → HubSpot API format |
| **Query / orchestration** | `src/server/registrations/query.ts` | Load, validate, enrich, persist all registrations |
| **HubSpot client** | `src/server/hubspot/client.ts` | HTTP fetch wrapper with auth |
| **HubSpot upsert** | `src/server/hubspot/upsert.ts` | Batch contact upsert by email |
| **Sync runner** | `src/server/sync/run.ts` | End-to-end sync pipeline with audit trail |
| **Server actions** | `src/app/dashboard/*/actions.ts` | Server-side mutations callable from client |
| **Pages** | `src/app/dashboard/*/page.tsx` | Next.js App Router pages |
| **Components** | `src/components/dashboard/` | Interactive client-side UI |

---

## 4. The Three Source Systems

### Hapily — Course Registrations (`COURSE`)

Hapily is an event management platform used for ACC mountaineering courses and programs.

**Data shape:**
```typescript
{
  firstName, lastName, email,
  phone?,              // inconsistent format (see normalization)
  membershipNumber?,
  membershipType?,     // "Full" | "Associate" | "Youth" | ...
  section?,            // "Calgary" | "YYC Section" | "YYC" | ...
  courseCode,          // e.g. "GMC-2026"
  courseName,          // e.g. "General Mountaineering Camp"
  startDate,           // ISO date
  waiverSigned,        // boolean — required for sync eligibility
  emergencyContact?,
  postalCode?
}
```

**Known data quality issues:** Section name variants (same city, 4 different strings), optional emergency contact, inconsistent phone formats.

---

### Mews — Hut Bookings (`HUT_BOOKING`)

Mews is a hospitality platform used to manage ACC hut reservations.

**Data shape:**
```typescript
{
  firstName, lastName, email,
  phone?,
  hutName,             // e.g. "Stanley Mitchell Hut"
  checkIn, checkOut,   // ISO dates
  partySize,           // number
  membershipNumber?,
  waiverSigned,
  specialRequests?
}
```

**Known data quality issues:** Phone formats vary widely (5 different formats in seed data), no emergency contact field.

---

### Sections — Memberships (`MEMBERSHIP`)

Manually maintained records submitted by regional ACC sections.

**Data shape:**
```typescript
{
  firstName, lastName, email,
  phone?,
  membershipType,      // required — "Full" | "Associate" | "Youth" | "Family" | ...
  section,             // ACC section name
  renewalDate?,
  postalCode?,
  emergencyContact?,
  waiverSigned,
  prmType?             // accessibility: "None" | "Mobility" | "Visual" | ...
}
```

**Known data quality issues:** Some records have empty `membershipType` (data entry error), missing emergency contacts, manual entry inconsistencies.

---

## 5. Data Model

Four tables capture the full lifecycle of a registration from ingestion to CRM sync.

### `registrations`

The core table. One row per source record. Stores both the immutable raw payload and the derived validation/sync state.

```
id              — CUID primary key
sourceType      — "COURSE" | "HUT_BOOKING" | "MEMBERSHIP"
externalId      — ACC's own identifier (unique per sourceType)
sourceRef       — Human-readable reference (e.g. booking number)
email           — Extracted for fast querying and deduplication
firstName       — Extracted for display
lastName        — Extracted for display
rawData         — Full original JSON payload (source of truth, never mutated)
validationStatus— "PENDING" | "VALID" | "WARNING" | "BLOCKED" | "DUPLICATE"
validationErrors— JSON array of ValidationIssue objects
syncStatus      — "PENDING" | "SYNCED" | "FAILED" | "SKIPPED"
hubspotId       — HubSpot contact ID once synced
createdAt, updatedAt
```

**Key design decision:** `rawData` is stored as-is and never modified. All transformation happens at query time. This means you can always reprocess records if validation logic changes.

### `sync_runs`

One row per batch sync execution. Denormalized counts enable fast dashboard queries without aggregating `sync_records`.

```
id              — CUID primary key
status          — "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"
triggeredBy     — "Manual" | "Scheduled" | etc.
totalRecords    — count of records in this run
syncedRecords   — count successfully sent to HubSpot
failedRecords   — count that errored
skippedRecords  — count skipped (invalid, duplicate, missing email)
startedAt, completedAt
```

### `sync_records`

Per-record audit trail. Every record in every sync run gets one row here.

```
id              — CUID primary key
syncRunId       — FK to sync_runs (CASCADE delete)
registrationId  — FK to registrations (CASCADE delete)
action          — "CREATED" | "UPDATED" | "SKIPPED" | "FAILED"
hubspotId       — resulting HubSpot contact ID
errorMessage    — populated on FAILED
durationMs      — time taken for this record's sync
createdAt
```

### `field_mappings`

Database-driven configuration for how source fields map to HubSpot properties. Intended to make the mapping layer configurable without code changes (UI is a placeholder in the current build).

```
id              — CUID primary key
sourceType      — which ACC system
sourceField     — dot-notation path into rawData
hubspotObject   — "CONTACT" | "DEAL" | "COMPANY"
hubspotProperty — HubSpot property name (e.g. "firstname")
transformFn     — optional transform hint ("normalizePhone", "parseDate")
isActive        — toggle without deleting
```

### Relationships

```
Registration ──< SyncRecord >── SyncRun
```

Each `SyncRecord` belongs to exactly one `SyncRun` and one `Registration`. A `Registration` can appear in many sync runs over time (each time a sync is triggered).

---

## 6. The Processing Pipeline

Every time the registrations page loads, all records pass through this pipeline. Results are persisted back to the database.

### 6.1 Validation

**File:** `src/server/registrations/validation.ts`

Each record is validated against source-specific business rules. Issues are typed with a severity that determines the final status.

**Validation rules:**

| Rule | COURSE | HUT_BOOKING | MEMBERSHIP | Severity |
|---|---|---|---|---|
| Waiver signed | required | required | required | error |
| Email present | required | required | required | error |
| Membership type non-empty | — | — | required | error |
| Emergency contact | recommended | — | recommended | warning |
| Phone number | recommended | recommended | recommended | warning |

**Status derivation:**
```
any error issue    →  BLOCKED   (cannot sync)
any warning issue  →  WARNING   (syncs with caveats)
no issues          →  VALID     (syncs cleanly)
```

`BLOCKED` takes precedence over everything. A BLOCKED record will never be sent to HubSpot regardless of other fields.

The raw `rawData` JSON is first validated against a TypeScript type guard before rule checking. If the shape doesn't match the expected source type, the record is immediately BLOCKED with `RAW_DATA_INVALID`.

### 6.2 Deduplication

**File:** `src/server/registrations/validation.ts` — `findDuplicateIds()`

All registrations are loaded before any individual validation runs. A cross-source duplicate check runs over the full dataset:

1. Build a `Map<normalizedEmail → id[]>` across all records
2. Any email that appears more than once → all matching records are marked DUPLICATE

**Status precedence with duplicates:**
```
BLOCKED > DUPLICATE > WARNING > VALID
```

A BLOCKED record stays BLOCKED even if it shares an email. A VALID or WARNING record that shares an email becomes DUPLICATE.

**Why load all records first?** Deduplication is inherently a set operation — you can't detect a duplicate without knowing the full dataset. This is why `getRegistrationsForDashboard()` always loads all records before filtering.

### 6.3 Canonicalization & Normalization

**File:** `src/server/registrations/canonical.ts`

After validation, each record is transformed into a `CanonicalContact` — a unified, source-agnostic shape that all downstream code works with.

```typescript
type CanonicalContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;           // normalized
  membershipType: string | null;
  section: string | null;         // normalized
  waiverSigned: boolean;
  emergencyContact: string | null;
  extras: Record<string, ...>;    // source-specific fields
}
```

**Why this layer exists:** Without a canonical form, the HubSpot payload builder would need to handle 3 different source shapes. Adding a 4th source would require changing the payload builder. With this layer, you only change the canonicalizer for the new source — everything downstream stays the same.

**Phone normalization** (`normalizePhone`):

Strips all non-digit characters, then re-formats to E.164:
```
"(403) 555-1234"  →  "+14035551234"
"403-555-1234"    →  "+14035551234"
"14035551234"     →  "+14035551234"
"4035551234"      →  "+14035551234"
"+1 403 555 1234" →  "+14035551234"
```

**Section normalization** (`normalizeSection`):

Maps known variants to a canonical city name via a lookup table:
```
"yyc"             →  "Calgary"
"YYC Section"     →  "Calgary"
"calgary section" →  "Calgary"
"Calgary"         →  "Calgary"
"van"             →  "Vancouver"
```

### 6.4 HubSpot Payload Transformation

**File:** `src/server/registrations/hubspot-payload.ts`

Converts the canonical contact into the flat key-value property object that HubSpot's API expects. Only includes fields that have a value (no null/undefined entries sent to the API).

**Standard HubSpot properties:**
```
firstname, lastname, email, phone
```

**Custom ACC properties (must be created in HubSpot):**
```
acc_waiver_signed         — boolean
acc_membership_type       — string
acc_section               — string (normalized)
acc_emergency_contact     — string
acc_last_course_code      — string (from COURSE extras)
acc_last_course_name      — string (from COURSE extras)
acc_last_hut_booked       — string (from HUT_BOOKING extras)
acc_membership_renewal_date — string (from MEMBERSHIP extras)
acc_prm_type              — string (from MEMBERSHIP extras)
zip                       — postal code
```

---

## 7. HubSpot Integration

### Authentication

HubSpot Private App token stored in `HUBSPOT_PRIVATE_APP_TOKEN` environment variable. Sent as `Authorization: Bearer <token>` on every request. No OAuth flow needed for internal tools.

### HTTP Client

**File:** `src/server/hubspot/client.ts`

Generic `hubspotFetch<T>()` wrapper that:
- Prepends the HubSpot base URL
- Attaches auth header
- Sets `cache: "no-store"` (never serve stale auth responses)
- Throws a descriptive error on any non-2xx response, including the API's error text

### Contact Upsert

**File:** `src/server/hubspot/upsert.ts`

Uses HubSpot's **batch upsert** endpoint: `POST /crm/v3/objects/contacts/batch/upsert`

Key properties:
- `idProperty: "email"` — HubSpot matches existing contacts by email address
- If a contact with that email exists → **update** it
- If no contact exists → **create** it

This is the correct pattern for CRM sync: idempotent, email-keyed, no need to track HubSpot IDs before the first sync.

### Health Check

**File:** `src/server/hubspot/health.ts`
**API route:** `GET /api/hubspot/health`

Calls `GET /account-info/v3/details` to verify the token is valid and return the connected portal's ID. Useful for confirming the integration is configured correctly before running a sync.

---

## 8. Sync Orchestration

**File:** `src/server/sync/run.ts`

`runRegistrationSync()` is the top-level function that executes a complete sync run.

### Step-by-step

```
1.  getRegistrationsForDashboard()
    → loads and validates all records, returns enriched rows

2.  db.syncRun.create({ status: "RUNNING", totalRecords })
    → creates audit record immediately so partial runs are visible

3.  For each registration:

    a. If validationStatus not in ["VALID", "WARNING"]
       → syncStatus = SKIPPED
       → syncRecord: action = SKIPPED, reason = validation status
       → continue

    b. If email is null/empty
       → syncStatus = SKIPPED
       → syncRecord: action = SKIPPED, reason = missing email
       → continue

    c. Try: upsertHubSpotContactByEmail(email, hubspotPayload)
       → action = UPDATED (if hubspotId already exists) or CREATED (new)
       → syncStatus = SYNCED
       → syncRecord: action, hubspotId, durationMs

    d. Catch: error from HubSpot API
       → syncStatus = FAILED
       → finalStatus = FAILED
       → syncRecord: action = FAILED, errorMessage, durationMs

4.  db.syncRun.update({ status: finalStatus, completedAt, counts })
    → marks run complete with final totals
```

### Status logic

- If **any** record fails, the entire `SyncRun` is marked `FAILED` (even if other records succeeded). This is intentional — it flags the run for attention.
- Individual record `syncStatus` is set granularly regardless of the run's overall status.
- `durationMs` is measured per record using `Date.now()` before and after the HubSpot call.

---

## 9. Next.js Patterns

### App Router

All pages use the Next.js 13+ App Router. Routes are defined by directory structure under `src/app/`.

### Server Components (default)

Page components are Server Components by default — they run on the server, can access the database directly, and return pre-rendered HTML. No client-side data fetching required for the initial page load.

```typescript
// src/app/dashboard/registrations/page.tsx
export const dynamic = "force-dynamic"; // re-render on every request

async function RegistrationsContent() {
  const rows = await getRegistrationsForDashboard(); // direct DB call
  return <RegistrationsTable rows={rows} />;
}
```

`force-dynamic` is used because the page writes to the database on load (validation status updates) and must always reflect the current state.

### Server Actions

Mutations (sync trigger, HubSpot health check) use Server Actions — functions marked `"use server"` that can be called directly from client components without a separate API endpoint.

```typescript
// src/app/dashboard/registrations/actions.ts
"use server";
export async function runRegistrationSyncAction() {
  const result = await runRegistrationSync();
  revalidatePath("/dashboard/registrations");
  revalidatePath("/dashboard/sync-runs");
  return result;
}
```

After a sync completes, `revalidatePath()` invalidates the Next.js cache for those routes, causing the next page visit to fetch fresh data.

### Client Components

UI-interactive components (table filtering, preview drawer, buttons with loading state) are Client Components marked `"use client"`. They receive pre-fetched data as props from Server Components and handle browser-only interactions.

### `server-only` guard

All server-side modules (`db.ts`, validation, hubspot client) import `"server-only"`. This causes a build error if any of these modules are accidentally imported in a Client Component — preventing secrets and DB logic from being bundled into the browser.

---

## 10. Key Technical Decisions & Trade-offs

| Decision | Rationale | Trade-off |
|---|---|---|
| **Validate on every page load** | Status always reflects current rules; logic changes take effect immediately | Re-runs all validation on every request; acceptable at this data scale |
| **Persist validation results back to DB** | `syncStatus` needs to reference `validationStatus`; sync runner reads from DB | DB writes on page load is unconventional; mitigated by only writing changed rows |
| **Canonical layer between raw data and HubSpot** | Decouples source format from CRM schema; adding a 4th source only requires a new canonicalizer | Extra indirection; more code for simple transformations |
| **Store `rawData` as JSON, never mutate** | Enables reprocessing if validation logic changes; full audit trail of source data | Slightly more complex queries; JSON columns less queryable than structured columns |
| **`FieldMapping` table** | Makes field-to-property mapping DB-configurable without deploys | Current UI is a placeholder; full implementation requires a mapping editor |
| **Batch upsert by email** | Idempotent; works for both new and returning contacts | If the same email has two different people, they overwrite each other (email must be unique identifier) |
| **Denormalized counts on `SyncRun`** | Fast dashboard queries — no aggregation needed | Counts could theoretically drift from actual `SyncRecord` rows; kept in sync by the runner |
| **Prisma singleton pattern** | Prevents connection pool exhaustion during Next.js dev hot reload | Requires careful globalThis usage; production does not have this issue |
| **`prisma migrate deploy` in build script** | Migrations auto-apply on every Vercel deploy | Slightly slower builds; safe because `migrate deploy` is idempotent |

---

## 11. The Demo Story

The seed data (`prisma/seed.ts`) is designed to showcase every feature of the pipeline. Here is what to point to during a demo:

### Validation statuses

| What to show | Why it's interesting |
|---|---|
| BLOCKED records (3 total) | Missing waiver (Courses + Hut), empty membershipType (Membership) — these are hard blockers, never synced |
| WARNING records (2 total) | Missing emergency contact — synced with caveats, visible in HubSpot |
| VALID records | Clean data, synced successfully |

### Cross-system deduplication

**Amara Diallo** (`amara.diallo@email.com`) appears in all 3 systems:
- As a course registrant (COURSE)
- As a hut booking guest (HUT_BOOKING)
- As a membership holder (MEMBERSHIP)

All three records are marked DUPLICATE. This demonstrates that the deduplication runs across the entire dataset, not within a single source.

**Talking point:** "In a real integration, you'd add a merge/master record step here — choosing which source of truth to use for each field. This demo flags the duplicates and lets a human decide."

### Data normalization

Open the preview drawer on any Course registration and compare:
- **Raw Payload tab** — shows `"section": "YYC Section"` or `"section": "YYC"`
- **Canonical tab** — shows `"section": "Calgary"` (normalized)

Similarly for phone numbers — raw data has 5 different formats; canonical always shows E.164.

### Sync audit trail

After clicking "Run HubSpot Sync":
- `/dashboard/sync-runs` shows the run with counts (synced / failed / skipped)
- Skipped records show the reason (e.g. "Skipped due to validation status: BLOCKED")
- Each registration's sync status badge updates (PENDING → SYNCED / SKIPPED / FAILED)

### HubSpot health check

`/dashboard/settings` — click "Test HubSpot Connection" to confirm the API token is valid and show the connected portal ID.

---

## 12. Local Setup

### Prerequisites

- Node.js 20+
- npm
- A PostgreSQL database (local or Neon)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and HUBSPOT_PRIVATE_APP_TOKEN

# 3. Apply database migrations
npm run db:migrate:deploy

# 4. Seed demo data (17 registrations + 24 field mappings)
npm run db:seed

# 5. Start dev server
npm run dev
```

Open `http://localhost:3000/dashboard/registrations`.

### Database commands

```bash
npm run db:generate        # Generate Prisma client from schema
npm run db:migrate         # Create a new migration (dev only)
npm run db:migrate:deploy  # Apply pending migrations (production-safe)
npm run db:status          # Show migration status
npm run db:seed            # Seed demo data
npm run db:studio          # Open Prisma Studio (visual DB browser)
npm run db:push            # Push schema without migration (prototyping only)
```

---

## 13. Deployment (Vercel + Neon)

### Environment variables (set in Vercel dashboard)

```bash
DATABASE_URL=postgresql://...     # Neon connection string (pooler URL)
HUBSPOT_PRIVATE_APP_TOKEN=pat-... # HubSpot Private App token
```

### Build process

The `build` script in `package.json` runs:
```
prisma migrate deploy && prisma generate && next build
```

1. **`prisma migrate deploy`** — applies any pending migrations to the production database (idempotent, safe to run every deploy)
2. **`prisma generate`** — regenerates the TypeScript client from the schema
3. **`next build`** — compiles the Next.js application

### Post-deploy checklist

- [ ] `/dashboard/registrations` loads with status badges visible
- [ ] Preview drawer opens on any row
- [ ] `/dashboard/settings` HubSpot health check returns success
- [ ] `/dashboard/sync-runs` shows history after running a sync

---

## Project Structure

```
acc-demo/
├── prisma/
│   ├── schema.prisma          # Database schema (4 models)
│   ├── seed.ts                # Demo data (17 registrations)
│   └── migrations/            # SQL migration history
├── src/
│   ├── app/
│   │   ├── api/hubspot/health/ # GET /api/hubspot/health
│   │   └── dashboard/
│   │       ├── layout.tsx     # Sidebar navigation
│   │       ├── registrations/ # Main table page + server actions
│   │       ├── sync-runs/     # Sync history page
│   │       ├── settings/      # HubSpot test button
│   │       └── mappings/      # Field mapping UI (placeholder)
│   ├── components/
│   │   ├── dashboard/         # Feature components (table, buttons)
│   │   └── ui/                # shadcn/ui primitives
│   ├── lib/
│   │   ├── types.ts           # Domain types (SourceType, ValidationStatus, etc.)
│   │   ├── db.ts              # Prisma singleton
│   │   └── utils.ts           # cn() class merging utility
│   └── server/
│       ├── registrations/
│       │   ├── validation.ts  # Business rule checks + deduplication
│       │   ├── canonical.ts   # Normalization into unified shape
│       │   ├── hubspot-payload.ts # Transform canonical → HubSpot format
│       │   └── query.ts       # Load + validate + enrich all registrations
│       ├── hubspot/
│       │   ├── client.ts      # HTTP fetch wrapper
│       │   ├── health.ts      # Connection health check
│       │   └── upsert.ts      # Batch contact upsert by email
│       └── sync/
│           └── run.ts         # Full sync pipeline with audit trail
├── package.json
├── prisma.config.ts           # Prisma CLI configuration
└── next.config.ts
```
