# ACC Demo

Next.js dashboard for ACC registration ingestion, validation, and HubSpot sync simulation.

## Requirements

- Node.js 20+
- npm
- PostgreSQL (local for migration generation, Neon for deployment)

## Environment

Create `.env.local`:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
HUBSPOT_PRIVATE_APP_TOKEN="pat-na1-..."
```

## Local Development

```bash
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open `http://localhost:3000/dashboard/registrations`.

## Database Commands

```bash
npm run db:generate        # prisma generate
npm run db:migrate         # prisma migrate dev
npm run db:migrate:deploy  # prisma migrate deploy
npm run db:status          # prisma migrate status
npm run db:seed            # prisma db seed
npm run db:studio          # prisma studio
```

## Vercel Deployment (Recommended Flow)

1. Provision Neon Postgres in Vercel Storage.
2. Set Vercel env vars:
   - `DATABASE_URL` (Neon URL)
   - `HUBSPOT_PRIVATE_APP_TOKEN`
3. Ensure migrations are committed (already includes initial migration in `prisma/migrations`).
4. Apply migrations to Neon:
   ```bash
   npm run db:migrate:deploy
   ```
5. Seed demo data once (optional):
   ```bash
   npm run db:seed
   ```
6. Push branch and deploy via Vercel.

## Post-Deploy Checks

- `/dashboard/registrations` loads.
- status badges are visible (`VALID`, `WARNING`, `BLOCKED`, `DUPLICATE`).
- preview drawer opens.
- `/dashboard/settings` HubSpot health check returns success.
