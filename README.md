# Vinho

A terroir-first, privacy-respecting wine journal and recommender.

## Tech stack

- **Web**: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL 15, Auth, Edge Functions, Storage, pgvector)
- **iOS**: SwiftUI (iOS 17+), MapKit
- **Android**: Kotlin, Jetpack Compose, Material 3
- **Secrets**: Doppler
- **CI/CD**: GitHub Actions, Vercel
- **AI**: OpenAI GPT-4o (label extraction), Jina CLIP v1 (visual embeddings), Supabase gte-small (text embeddings)

## Prerequisites

- Node.js 22+
- pnpm 9.12+
- Docker (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started): `brew install supabase/tap/supabase`
- [Doppler CLI](https://docs.doppler.com/docs/install-cli): `brew install dopplerhq/cli/doppler`

## Getting started

```bash
# Install dependencies
pnpm install

# Start local Supabase (Postgres, Auth, Storage, Edge Runtime)
supabase start

# Reset database, apply migrations, seed data
supabase db reset

# Sync API keys from Doppler for local edge functions
./scripts/sync-env-local.sh

# Start the dev server
pnpm dev
```

Open http://localhost:3000.

## Environment variables

All secrets are managed in [Doppler](https://dashboard.doppler.com) under the `vinho` project. The `pnpm dev` command injects them automatically via `doppler run`.

| Variable | Where used | Description |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Web app (client) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web app (client) | Supabase anonymous/public key |
| `VINHO_SERVICE_ROLE_KEY` | Edge functions | Supabase service role key (bypasses RLS) |
| `OPENAI_API_KEY` | Edge functions | GPT-4o for wine label extraction and enrichment |
| `JINA_API_KEY` | Edge functions | Jina CLIP v1 for visual label embeddings |
| `NEXT_PUBLIC_POSTHOG_KEY` | Web app (client) | PostHog analytics key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Web app (client) | PostHog API host |
| `RESEND_API_KEY` | Edge functions | Resend email delivery |
| `RESEND_FROM_EMAIL` | Edge functions | Sender email address |
| `GOOGLE_MAPS_API_KEY` | Web app | Google Maps for location features |
| `HCAPTCHA_SITE_KEY` | Web app (client) | hCaptcha site key |
| `HCAPTCHA_SECRET_KEY` | Web app (server) | hCaptcha verification key |

### Doppler configs

| Config | Environment | Used by |
|--------|------------|---------|
| `dev` | Local development | `pnpm dev`, `sync-env-local.sh` |
| `stg` | Staging/preview | Vercel preview deployments |
| `prd` | Production | Vercel production, Supabase Cloud |

### Edge function secrets (local)

Edge functions run inside the Supabase Docker runtime and can't use `doppler run` directly. Instead, `supabase/.env.local` bridges Doppler secrets to the edge runtime:

```bash
# Generate supabase/.env.local from Doppler
./scripts/sync-env-local.sh

# Serve edge functions locally
supabase functions serve --env-file supabase/.env.local
```

This file is gitignored. Run `sync-env-local.sh` whenever you rotate keys in Doppler.

## Test user

Seeded automatically by `supabase db reset`:

| Field | Value |
|-------|-------|
| Email | `test@vinho.app` |
| Password | `testpassword123` |
| UUID | `00000000-0000-0000-0000-000000000001` |
| Profile | Test Taster, casual style |

This user has 20 tastings, 3 scans, and 1 pending queue item seeded for testing.

## Commands

### Development

```bash
pnpm dev                    # Start Next.js dev server (injects Doppler secrets)
pnpm lint                   # Lint the web app
pnpm --filter vinho-web run typecheck  # TypeScript check
```

### Testing

```bash
pnpm --filter vinho-web run test              # Unit tests (no Supabase needed)
pnpm --filter vinho-web run test:integration  # Integration tests (requires local Supabase)
pnpm --filter vinho-web run test:ci           # All tests for CI
```

### Simulation

```bash
pnpm simulate               # Upload 10 wine label images and queue them
pnpm simulate:process        # Same, plus invoke the process-wine-queue edge function
```

The simulation uploads real wine label fixtures from `supabase/fixtures/wine-labels/` to local storage, creates scan records, and queues them for processing.

### Database

```bash
supabase start              # Start local Supabase
supabase db reset           # Wipe and rebuild from migration + seeds
supabase migration new <name>  # Create a new migration
supabase db push            # Push migrations to production (or via CI)
supabase gen types typescript --local > apps/vinho-web/lib/database.types.ts  # Regenerate types
```

### Edge functions

```bash
supabase functions serve --env-file supabase/.env.local   # Serve all functions locally
```

## Project structure

```
vinho/
  apps/
    vinho-web/              # Next.js 16 web app
    vinho-ios/              # SwiftUI iOS app
    vinho-android/          # Jetpack Compose Android app
  supabase/
    migrations/             # Production schema (single pulled migration + incremental)
    migrations-archive/     # Old local-only migrations (preserved for reference)
    functions/              # Edge Functions (process-wine-queue, generate-embeddings, etc.)
    fixtures/wine-labels/   # 10 real wine label images for simulation
    seeds/                  # Seed SQL source files
    seed.sql                # Active seed (test user, 20 wines, tastings, scans)
    config.toml             # Local Supabase config (ports, buckets, auth)
    .env.local              # Edge function secrets (gitignored, generated from Doppler)
    shared/                 # Shared utilities for edge functions
  scripts/
    sync-env-local.sh       # Sync Doppler secrets to supabase/.env.local
    simulate-wine-upload.ts # Wine upload simulation (lives in apps/vinho-web/scripts/)
  .github/workflows/
    ci.yml                  # PR checks: lint, typecheck, unit + integration tests
    deploy.yml              # On merge to main: push migrations, deploy edge functions
```

## CI/CD

### Pull requests

GitHub Actions runs lint, typecheck, and both unit and integration tests (with local Supabase) on every PR to `main`.

### Deployment

On merge to `main`:
1. Supabase migrations are pushed via `supabase db push`
2. Edge functions are deployed via `supabase functions deploy`
3. Vercel auto-deploys the web app

### Required GitHub secrets

| Secret | Description |
|--------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI auth token |
| `SUPABASE_PROJECT_ID` | `aghiopwrzzvamssgcwpv` |

## Image processing pipeline

When a user scans a wine label, Vinho runs a multi-step pipeline that identifies the wine, creates database records, and builds a searchable index for future scans.

### Processing steps

1. **Image capture**: Client compresses to max 2000px JPEG at 0.8 quality
2. **Upload and queue**: Image goes to Supabase Storage `scans` bucket, scan record created, queue item inserted as `pending`
3. **Visual embedding match** (fastest): Jina CLIP generates 768-dim embedding, searches `wine-labels` vector bucket. Threshold: 92% similarity
4. **Text vector match** (free): Supabase gte-small generates 384-dim embedding from OCR text, searches `wine_embeddings` via pgvector. Threshold: 90% similarity
5. **OpenAI Vision extraction**: GPT-4o-mini extracts structured data. Below 60% confidence, escalates to GPT-4o
6. **Record creation**: Region, producer, wine, vintage, and grape varietals created with upsert logic
7. **Embedding storage**: Visual embedding stored for future matches, text embedding queued
8. **Enrichment**: Separate queue fills in tasting notes, food pairings, aging potential via GPT-4o-mini

| Match method | Speed | Cost | Threshold |
|-------------|-------|------|-----------|
| Visual embedding (Jina CLIP) | < 2s | Low | 92% |
| Text vector (gte-small) | 2-4s | Free | 90% |
| OpenAI Vision (GPT-4o-mini/4o) | 8-15s | Highest | 60% escalation |

## License

Private. All rights reserved.
