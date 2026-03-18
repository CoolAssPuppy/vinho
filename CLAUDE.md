# Vinho project guide

## Overview

Wine tasting journal app. Next.js 16 web app + iOS + Android. Supabase backend (Postgres, Auth, Storage, Edge Functions). Deployed on Vercel (web) and Supabase Cloud.

## Local development

### Prerequisites

- Node 22+, pnpm 9.12+
- Docker (for local Supabase)
- Supabase CLI (`brew install supabase/tap/supabase`)

### Start local environment

```bash
supabase start          # Starts Postgres, Auth, Storage, Edge Runtime
supabase db reset       # Reset DB, apply migration, run seeds
cd apps/vinho-web && pnpm dev
```

Local Supabase endpoints:
- API: http://127.0.0.1:54321
- Studio: http://127.0.0.1:54323
- DB: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### Test user

Seeded by `supabase/seed.sql`:
- Email: `test@vinho.app`
- Password: `testpassword123`
- UUID: `00000000-0000-0000-0000-000000000001`

## Schema workflow

The project uses a single pulled migration (`supabase/migrations/20260318112806_remote_schema.sql`) that IS the production schema. Old migrations are archived in `supabase/migrations-archive/`.

### Making schema changes

1. Write a new migration: `supabase migration new <name>`
2. Test locally: `supabase db reset`
3. Apply to production: `supabase db push` (or via CI on merge to main)

### Generating types

```bash
supabase gen types typescript --local > apps/vinho-web/lib/database.types.ts
```

## Testing

```bash
# Unit tests (no Supabase required)
pnpm --filter vinho-web run test

# Integration tests (requires local Supabase running)
pnpm --filter vinho-web run test:integration

# All tests for CI
pnpm --filter vinho-web run test:ci
```

Integration tests run against local Supabase and validate:
- RLS policies (reference table access, user isolation, anon blocking)
- Wine submission workflow (scan creation, queue item linking, cross-user isolation)
- Queue processing (atomic claiming, status transitions, retry limits)

## CI/CD

- **PR checks** (`.github/workflows/ci.yml`): Lint, typecheck, unit tests, integration tests with local Supabase
- **Deploy** (`.github/workflows/deploy.yml`): On merge to main, pushes migrations and deploys edge functions

Required GitHub secrets:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID` (aghiopwrzzvamssgcwpv)

## Key architecture notes

- Production schema has no `climate_zones`, `soil_types`, or `vineyards` tables (they were local-only). Old seeds referencing them are archived in `supabase/seeds-archive/`.
- The pulled migration sets `search_path` to empty. A reset line at the end restores it for seeds.
- Cloud-only features commented out in migration: pg_cron, pg_net, pg_graphql, pg_stat_statements, supabase_vault, S3 FDW. Functions referencing `net.http_post` and `vault.decrypted_secrets` exist but fail at runtime locally (fine -- those are cron/trigger functions).
- GoTrue requires ALL varchar columns in auth.users to be empty strings, not NULL. The seed handles this explicitly.
- Storage buckets (scans, avatars, wine-labels) are configured in `supabase/config.toml`.

## Project structure

```
apps/vinho-web/          # Next.js 16 web app
apps/vinho-ios/          # SwiftUI iOS app
apps/vinho-android/      # Jetpack Compose Android app
supabase/
  migrations/            # Single production schema migration
  migrations-archive/    # Old local-only migrations
  seeds/                 # Seed source files
  seeds-archive/         # Old seeds (reference non-existent tables)
  seed.sql               # Active seed (symlinked from seeds/06)
  functions/             # Edge Functions
  config.toml            # Local Supabase config
.github/workflows/       # CI/CD pipelines
```
