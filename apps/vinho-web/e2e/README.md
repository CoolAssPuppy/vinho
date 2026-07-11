# Vinho web e2e (Playwright)

End-to-end tests that drive the real Next.js app in a browser against a local
Supabase stack. Structure mirrors the Strategic Nerds reference harness.

## Layout

- `auth/auth.setup.ts` — signs in as the seeded test user, saves storage state to `.auth/user.json`.
- `auth/login.unauth.spec.ts` — signed-out flows (form render, invalid creds, protected-route redirect).
- `journal.spec.ts` — authenticated app shell (journal, map, scan, profile load).
- `sharing.spec.ts` — sharing surface + invite entry point.

Specs ending in `.unauth.spec.ts` run signed-out; all others reuse the seeded
storage state via the `chromium` project.

## Prerequisites

1. **Playwright is not yet in the lockfile.** Add it once:
   ```bash
   pnpm --filter vinho-web add -D @playwright/test
   pnpm --filter vinho-web exec playwright install --with-deps chromium
   ```
2. **A local Supabase stack with the seeded test user** (`test@vinho.app` /
   `testpassword123` from `supabase/seed.sql`). The web app's
   `NEXT_PUBLIC_SUPABASE_URL` must point at it.

   > Known local gotcha (documented in the project memory): the Supabase CLI
   > currently hangs on `db reset`/`start` on this machine (pg_cron/pg_net/realtime
   > hold connections). Apply the schema via direct `psql` if needed. CI runners
   > start cleanly, so the e2e job below is the reliable path to run these.

## Running

```bash
# from apps/vinho-web
pnpm run test:e2e            # headless
pnpm run test:e2e:ui        # Playwright UI mode
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm run test:e2e
```

The config boots `pnpm run dev` automatically (`webServer`) and reuses an
already-running server locally.

## CI

`.github/workflows/ci.yml` has an `e2e` job: it starts local Supabase, seeds the
test user, builds the web app, installs the Chromium browser, and runs the suite.
Traces/screenshots/video are captured on failure and uploaded as an artifact.
