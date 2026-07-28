# Vinho project guide

## Overview

Wine tasting journal app. Next.js 16 web app + iOS + Android. Supabase backend (Postgres, Auth, Storage, Edge Functions). Deployed on Vercel (web) and Supabase Cloud.

## Local development

### Prerequisites

- Node 22+, pnpm 11+
- Docker (for local Supabase)
- Supabase CLI (`brew install supabase/tap/supabase`)

### Start local environment

```bash
pnpm run doctor         # Verify toolchain, repo layout, local stack (do this first)
supabase start          # Starts Postgres, Auth, Storage, Edge Runtime
supabase db reset       # Reset DB, apply migrations, run seeds
pnpm dev                # Runs the web app through Doppler for secrets
```

Secrets come from Doppler (`doppler.yaml` pins project `vinho`, config `dev`), not
from committed `.env` files. A new machine needs `doppler login` and access to the
project.

On CLI 2.110.0, commands that talk to the linked project (`db push`, `migration list
--linked`) hang silently if `~/.supabase/profile` is missing. `--debug` reveals
`NotFound: FileSystem.readFile (/Users/<you>/.supabase/profile)`; the CLI is waiting
on a login prompt it cannot read. Fix it with `supabase login`, or export a token:

```bash
export SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -w)
```

Local commands (`start`, `db reset`, `db diff`) are unaffected. CI pins
`supabase/setup-cli` to 2.109.0 and authenticates via `SUPABASE_ACCESS_TOKEN`, so it
is not exposed to this.

If `supabase start` fails to pull `storage-api`, delete `supabase/.temp/storage-version`.
`supabase link` can write a stale image tag there that no longer exists upstream
(supabase/cli#4148); the file is gitignored, so this only ever affects an existing
checkout, never a fresh clone.

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

The project uses **declarative schemas**. `supabase/schemas/` describes the desired
state; migrations are generated from it. Read `supabase/schemas/README.md` before
changing the schema.

1. Edit the files in `supabase/schemas/` (never Studio, never the SQL editor)
2. Generate the migration: `supabase db diff -f <name>`
3. Test locally: `supabase db reset`
4. Apply to production: `supabase db push` (or via CI on merge to main)

Some entities cannot be tracked by the diff engine and must be hand-written as
migrations: materialized views, comments, column privileges, `alter policy`, DML,
publications, and grants arising from default privileges. This project uses several
of them (`user_wine_stats_materialized`, 32 `comment on` statements, the
`SECURITY DEFINER` function-grant lockdown). After hand-writing such a migration,
refresh `supabase/schemas/10_public.sql` and confirm `supabase db diff` prints
"No schema changes found".

`supabase/schemas/20_storage_policies.sql` exists because `supabase db dump` omits
the storage schema. Without it, `db diff` proposes dropping all nine storage RLS
policies, which would expose every user's scans and avatars. Never apply a diff that
drops storage policies.

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

# Unit + integration together in CI mode (requires local Supabase; excludes edge-function suites)
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
  seed.sql               # Active seed (copy of seeds/06_test_wines_and_tastings.sql)
  functions/             # Edge Functions
  config.toml            # Local Supabase config
.github/workflows/       # CI/CD pipelines
```
